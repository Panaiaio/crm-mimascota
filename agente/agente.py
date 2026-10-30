"""
Agente lector de facturas (Mi Mascota).

Lee facturas de dos sitios y guarda sus datos en la tabla facturas de Supabase:
  - la carpeta facturas/entrada: facturas de proveedores (PDF o foto) -> tipo "recibida";
  - el bucket "pedidos" de Supabase Storage: el PDF de cada pedido de venta del CRM
    (los presupuestos no llegan nunca) -> tipo "emitida", enlazada a la venta.

No vigila nada por su cuenta: trabaja cuando se pulsa «Revisar facturas» en la pantalla
Pedidos del CRM (desde Vercel, en cualquier ordenador). El botón deja una petición en la
tabla peticion_agente y Supabase Realtime avisa al agente al momento. Entonces comprueba qué
facturas están ya en la base de datos (con esas no hace nada), guarda las que falten y apunta
el resultado en la petición para que el CRM lo enseñe.

Con cada documento que falta:
  1. el agente se lo pasa a la IA (Gemini, Claude... por la API de OpenRouter) con unas instrucciones fijas;
  2. la IA lo lee y pide usar la herramienta guardar_factura con los datos en JSON;
  3. el agente ejecuta guardar_factura: POST a la API REST de Supabase -> INSERT en la tabla facturas;
  4. fin: no se vuelve a preguntar a la IA.

La IA nunca toca la base de datos: solo decide y devuelve los datos; quien guarda es el agente.
Cada documento es una conversación nueva (no hace falta recordar los anteriores).

Uso:
  python agente.py              se queda encendido esperando el botón del CRM
  python agente.py --una-vez    revisa una vez sin esperar al botón y termina
"""

import argparse
import asyncio
import base64
import mimetypes
import os
import shutil
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Optional

import requests
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import InjectedToolArg, tool
from langchain_openai import ChatOpenAI

AQUI = Path(__file__).resolve().parent
load_dotenv(AQUI / ".env")

# ------------------------------------------------------------
# Configuración (agente/.env, ver .env.example)
# ------------------------------------------------------------

OPENROUTER_URL = "https://openrouter.ai/api/v1"
MODELO = os.getenv("MODELO", "google/gemini-2.5-flash")  # el "cerebro": cambiar de modelo es cambiar este nombre
CARPETA = AQUI / os.getenv("CARPETA", "facturas")
BUCKET_PEDIDOS = "pedidos"  # el CRM deja aquí <id_venta>.pdf de cada pedido

ENTRADA = CARPETA / "entrada"
PROCESADAS = CARPETA / "procesadas"
ERRORES = CARPETA / "error"

IMAGENES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ADMITIDOS = IMAGENES | {".pdf"}

FORMATO = """Formato: la fecha como AAAA-MM-DD; los importes como números con punto decimal y sin símbolo (1234.50).
El IVA es el importe del impuesto, no el porcentaje. Si hay varios tipos de IVA (por ejemplo 21 % y 10 %),
el IVA es la suma de todas las cuotas."""

# Instrucciones fijas que recibe la IA con cada documento. Son siempre las mismas.
INSTRUCCIONES = f"""Eres un asistente de administración.
Lee la factura que te paso (PDF o foto).
Saca: número, fecha, proveedor, NIF, base imponible, IVA y total.
Si un dato no aparece, déjalo vacío.
No inventes nada.
Cuando lo tengas, llama a guardar_factura.

{FORMATO}"""

INSTRUCCIONES_PEDIDO = f"""Eres un asistente de administración.
Lee el pedido de venta que te paso (PDF). Lo emite la clínica veterinaria a un cliente.
Saca: número del pedido, fecha, quien lo emite (proveedor) y su NIF, el cliente y su NIF,
base imponible, IVA y total.
Si un dato no aparece, déjalo vacío.
No inventes nada.
Cuando lo tengas, llama a guardar_factura.

{FORMATO}"""


class FacturaRepetida(Exception):
    """La factura ya estaba guardada (mismo número y NIF)."""


# ------------------------------------------------------------
# Limpieza de los datos que devuelve la IA
# ------------------------------------------------------------

def a_texto(valor) -> Optional[str]:
    if valor is None:
        return None
    texto = str(valor).strip()
    return texto or None


def a_numero(valor) -> Optional[float]:
    """Acepta 1234.5, "1234.50" y también "1.234,50" (formato español)."""
    if valor is None or valor == "":
        return None
    if isinstance(valor, (int, float)):
        return round(float(valor), 2)
    texto = str(valor).replace("€", "").replace(" ", "").strip()
    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")
    try:
        return round(float(texto), 2)
    except ValueError:
        return None


def a_fecha(valor) -> Optional[str]:
    """Devuelve AAAA-MM-DD o None. Acepta también dd/mm/aaaa."""
    texto = a_texto(valor)
    if not texto:
        return None
    for formato in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(texto, formato).date().isoformat()
        except ValueError:
            pass
    return None


# ------------------------------------------------------------
# Supabase (API REST y Storage) con la clave service_role
# ------------------------------------------------------------

def supabase(metodo: str, ruta: str, **kwargs) -> requests.Response:
    clave = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    cabeceras = {"apikey": clave, "Authorization": f"Bearer {clave}", **kwargs.pop("headers", {})}
    url = os.environ["SUPABASE_URL"].rstrip("/") + ruta
    return requests.request(metodo, url, headers=cabeceras, timeout=30, **kwargs)


def comprobar(respuesta: requests.Response, que: str) -> requests.Response:
    if not respuesta.ok:
        raise RuntimeError(f"Supabase no ha podido {que} ({respuesta.status_code}): {respuesta.text[:300]}")
    return respuesta


# ------------------------------------------------------------
# Herramienta: guardar_factura
# La IA solo pide usarla con un JSON; quien la ejecuta, y hace el INSERT, es el agente.
# ------------------------------------------------------------

def insertar_en_supabase(fila: dict) -> dict:
    """POST a /rest/v1/facturas: Supabase lo convierte en un INSERT.
    Una factura emitida se enlaza a su venta: si ese pedido ya estaba guardado, se actualiza."""
    ruta, preferencias = "/rest/v1/facturas", "return=representation"
    if fila.get("id_venta_fk"):
        ruta += "?on_conflict=id_venta_fk"
        preferencias += ",resolution=merge-duplicates"
    respuesta = supabase("POST", ruta, json=fila, headers={"Content-Type": "application/json", "Prefer": preferencias})
    if respuesta.status_code == 409:
        raise FacturaRepetida(f"ya está guardada la factura {fila.get('numero')} de {fila.get('proveedor')}")
    return comprobar(respuesta, "guardar la factura").json()[0]


@tool
def guardar_factura(
    numero: Optional[str] = None,
    fecha: Optional[str] = None,
    proveedor: Optional[str] = None,
    nif: Optional[str] = None,
    cliente: Optional[str] = None,
    nif_cliente: Optional[str] = None,
    base: Optional[float] = None,
    iva: Optional[float] = None,
    total: Optional[float] = None,
    archivo: Annotated[str, InjectedToolArg] = "",
    tipo: Annotated[str, InjectedToolArg] = "recibida",
    id_venta: Annotated[Optional[str], InjectedToolArg] = None,
) -> dict:
    """Guarda una factura en Supabase.

    Args:
        numero: número de la factura o del pedido tal como aparece.
        fecha: fecha del documento en formato AAAA-MM-DD.
        proveedor: nombre de la empresa o persona que emite el documento.
        nif: NIF o CIF de quien lo emite.
        cliente: nombre de la empresa o persona a quien va dirigido.
        nif_cliente: NIF o CIF del cliente.
        base: base imponible (importe antes de impuestos).
        iva: importe del IVA (no el porcentaje).
        total: importe total.
    """
    fila = {
        "tipo": tipo,
        "numero": a_texto(numero),
        "fecha": a_fecha(fecha),
        "proveedor": a_texto(proveedor),
        "nif": a_texto(nif),
        "cliente": a_texto(cliente),
        "nif_cliente": a_texto(nif_cliente),
        "base": a_numero(base),
        "iva": a_numero(iva),
        "total": a_numero(total),
        "archivo": archivo,
    }
    if id_venta:
        fila["id_venta_fk"] = id_venta
        fila["fecha_alta"] = datetime.now(timezone.utc).isoformat()  # al actualizar, cuenta como leída ahora
    return insertar_en_supabase(fila)


# ------------------------------------------------------------
# El agente
# ------------------------------------------------------------

def crear_cerebro():
    """El cerebro: el modelo de OpenRouter (MODELO), obligado a responder con guardar_factura."""
    llm = ChatOpenAI(
        model=MODELO,
        api_key=os.environ["OPENROUTER_API_KEY"],
        base_url=OPENROUTER_URL,
        temperature=0,
        default_headers={"X-Title": "Agente lector de facturas - Mi Mascota"},
    )
    return llm.bind_tools([guardar_factura], tool_choice="guardar_factura")


def mensaje_con_documento(nombre: str, contenido: bytes, que: str) -> HumanMessage:
    """El documento tal cual (todavía no es JSON): un PDF o una foto, que la IA lee con visión."""
    tipo = mimetypes.guess_type(nombre)[0] or "application/octet-stream"
    url_datos = f"data:{tipo};base64,{base64.b64encode(contenido).decode()}"
    if Path(nombre).suffix.lower() in IMAGENES:
        adjunto = {"type": "image_url", "image_url": {"url": url_datos}}
    else:
        adjunto = {"type": "file", "file": {"filename": nombre, "file_data": url_datos}}
    return HumanMessage(content=[{"type": "text", "text": f"Este es {que} «{nombre}»."}, adjunto])


def cuadrar_iva(datos: dict, nombre: str):
    """Base + IVA tiene que dar el total. Si no cuadra (p. ej. la IA solo sumó uno de varios tipos de IVA),
    el IVA se recalcula como total - base: la base y el total vienen escritos una sola vez en el documento."""
    base, iva, total = datos.get("base"), datos.get("iva"), datos.get("total")
    if base is None or total is None:
        return
    correcto = round(total - base, 2)
    if iva is None or abs(base + iva - total) > 0.01:
        print(f"[corregido] {nombre}: el IVA leído ({iva}) no cuadra con base {base} y total {total}; se guarda {correcto}")
        datos["iva"] = correcto


def leer_y_guardar(nombre: str, contenido: bytes, cerebro, instrucciones: str, que: str, **inyectados) -> dict:
    # 1. agente -> IA: "este es el documento" (conversación nueva, sin memoria)
    respuesta = cerebro.invoke([SystemMessage(instrucciones), mensaje_con_documento(nombre, contenido, que)])
    # 2. IA -> agente: "usa guardar_factura con estos datos"
    llamadas = [c for c in respuesta.tool_calls if c["name"] == "guardar_factura"]
    if not llamadas:
        raise RuntimeError("La IA no ha pedido guardar_factura; no se guarda nada")
    datos = dict(llamadas[0]["args"])
    # Los importes se limpian antes de validar: la IA a veces los escribe como "1.234,50"
    for campo in ("base", "iva", "total"):
        if campo in datos:
            datos[campo] = a_numero(datos[campo])
    cuadrar_iva(datos, nombre)
    # 3. el agente ejecuta guardar_factura -> INSERT en Supabase
    guardada = guardar_factura.invoke({**datos, "archivo": nombre, **inyectados})
    # 4. fin: no se vuelve a preguntar a la IA
    return guardada


def resumen(fila: dict) -> str:
    quien = fila.get("cliente") if fila.get("tipo") == "emitida" else fila.get("proveedor")
    return f"{fila.get('numero') or '(sin número)'} de {quien or '(sin nombre)'}, total {fila.get('total')}"


# --- Resultado de una revisión ---

@dataclass
class Resultado:
    guardadas: int = 0       # facturas nuevas guardadas
    ya_estaban: int = 0      # ya estaban en la base de datos: no se hace nada con ellas
    errores: list[str] = field(default_factory=list)

    def texto(self) -> str:
        t = (f"{self.guardadas} {'factura guardada' if self.guardadas == 1 else 'facturas guardadas'}, "
             f"{self.ya_estaban} ya {'estaba' if self.ya_estaban == 1 else 'estaban'} en la base de datos")
        return t + (f", {len(self.errores)} con error" if self.errores else "")


# --- Facturas recibidas: la carpeta facturas/entrada ---

def mover(ruta: Path, destino: Path) -> Path:
    destino.mkdir(parents=True, exist_ok=True)
    final = destino / ruta.name
    if final.exists():
        final = destino / f"{ruta.stem}_{int(time.time())}{ruta.suffix}"
    shutil.move(str(ruta), final)
    return final


def pendientes() -> list[Path]:
    """Ficheros de la carpeta de entrada, del más antiguo al más nuevo.
    Se esperan 2 segundos desde el último cambio por si aún se está copiando."""
    ahora = time.time()
    ficheros = [p for p in ENTRADA.iterdir() if p.is_file() and not p.name.startswith(".")]
    return sorted((p for p in ficheros if ahora - p.stat().st_mtime > 2), key=lambda p: p.stat().st_mtime)


def revisar_carpeta(cerebro, r: Resultado):
    for ruta in pendientes():
        if ruta.suffix.lower() not in ADMITIDOS:
            mover(ruta, ERRORES)
            r.errores.append(f"{ruta.name}: formato no admitido (solo PDF, JPG, PNG, WEBP o GIF)")
            print(f"[error] {r.errores[-1]}")
            continue
        print(f"[leyendo] {ruta.name}")
        try:
            fila = leer_y_guardar(ruta.name, ruta.read_bytes(), cerebro, INSTRUCCIONES, "la factura", tipo="recibida")
        except FacturaRepetida as e:
            # Ya está en la base de datos: no se hace nada con ella
            mover(ruta, PROCESADAS)
            r.ya_estaban += 1
            print(f"[ya estaba] {ruta.name}: {e}")
            continue
        except Exception as e:  # que una factura mala no pare al agente
            mover(ruta, ERRORES)
            r.errores.append(f"{ruta.name}: {e}")
            print(f"[error] {r.errores[-1]}")
            continue
        mover(ruta, PROCESADAS)
        r.guardadas += 1
        print(f"[INSERT] {ruta.name} -> factura recibida {resumen(fila)}")


# --- Facturas emitidas: los pedidos del CRM (bucket "pedidos") ---

def pdfs_de_pedidos() -> list[dict]:
    respuesta = supabase("POST", f"/storage/v1/object/list/{BUCKET_PEDIDOS}",
                         json={"prefix": "", "limit": 1000, "offset": 0, "sortBy": {"column": "name", "order": "asc"}})
    return [o for o in comprobar(respuesta, "listar los PDF de pedidos").json() if o["name"].endswith(".pdf")]


def ventas_con_factura() -> set[str]:
    """Ventas que ya tienen su factura emitida en la base de datos."""
    respuesta = supabase("GET", "/rest/v1/facturas?select=id_venta_fk&tipo=eq.emitida&id_venta_fk=not.is.null")
    return {f["id_venta_fk"] for f in comprobar(respuesta, "leer las facturas emitidas").json()}


def ventas_en_pedido(ids: list[str]) -> dict[str, int]:
    """De esas ventas, las que siguen siendo un pedido (los presupuestos y los cancelados no se leen): id -> número."""
    respuesta = supabase("GET", f"/rest/v1/venta?select=id_venta,numero&estado=eq.pedido&id_venta=in.({','.join(ids)})")
    return {v["id_venta"]: v["numero"] for v in comprobar(respuesta, "comprobar los pedidos").json()}


def revisar_pedidos(cerebro, r: Resultado):
    con_factura = ventas_con_factura()
    faltan = []
    for o in pdfs_de_pedidos():
        id_venta = o["name"][:-4]
        if id_venta in con_factura:
            r.ya_estaban += 1  # ya está en la base de datos: no se hace nada con ella
        else:
            faltan.append((o["name"], id_venta))
    if not faltan:
        return

    pedidos = ventas_en_pedido([id_venta for _, id_venta in faltan])
    for nombre, id_venta in faltan:
        if id_venta not in pedidos:
            continue  # se canceló o volvió a presupuesto: ya no es un pedido
        codigo = f"V-{pedidos[id_venta]:04d}"
        print(f"[leyendo] pedido {codigo} ({nombre})")
        try:
            contenido = comprobar(supabase("GET", f"/storage/v1/object/{BUCKET_PEDIDOS}/{nombre}"), "descargar el PDF").content
            fila = leer_y_guardar(f"pedido-{codigo}.pdf", contenido, cerebro, INSTRUCCIONES_PEDIDO, "el pedido",
                                  tipo="emitida", id_venta=id_venta)
        except Exception as e:  # que un pedido malo no pare al agente
            r.errores.append(f"pedido {codigo}: {e}")
            print(f"[error] {r.errores[-1]}")
            continue
        r.guardadas += 1
        print(f"[INSERT] pedido {codigo} -> factura emitida {resumen(fila)}")


def revisar(cerebro) -> Resultado:
    """Comprueba qué facturas están ya en la base de datos y guarda las que falten."""
    r = Resultado()
    try:
        revisar_pedidos(cerebro, r)
    except Exception as e:  # sin conexión con Supabase: se sigue con la carpeta
        r.errores.append(f"pedidos: {e}")
        print(f"[error] {r.errores[-1]}")
    revisar_carpeta(cerebro, r)
    return r


# --- Peticiones del CRM (tabla peticion_agente) ---

def tomar_peticion(id_peticion: str) -> bool:
    """Marca la petición 'en_curso' solo si seguía 'pendiente' (si hay dos agentes, solo la atiende uno)."""
    respuesta = supabase("PATCH", f"/rest/v1/peticion_agente?id_peticion=eq.{id_peticion}&estado=eq.pendiente",
                         json={"estado": "en_curso"},
                         headers={"Content-Type": "application/json", "Prefer": "return=representation"})
    return bool(comprobar(respuesta, "tomar la petición").json())


def cerrar_peticion(id_peticion: str, r: Optional[Resultado], fallo: Optional[str] = None):
    datos = {"estado": "error" if fallo else "hecha", "fecha_fin": datetime.now(timezone.utc).isoformat()}
    if r:
        datos |= {"guardadas": r.guardadas, "ya_estaban": r.ya_estaban, "errores": len(r.errores),
                  "mensaje": "\n".join(r.errores)[:1000] or None}
    if fallo:
        datos["mensaje"] = fallo[:1000]
    comprobar(supabase("PATCH", f"/rest/v1/peticion_agente?id_peticion=eq.{id_peticion}", json=datos,
                       headers={"Content-Type": "application/json"}), "guardar el resultado de la petición")


def atender(id_peticion: str, cerebro):
    try:
        if not tomar_peticion(id_peticion):
            return  # ya la había atendido otro
        print(f"\n[petición] Revisar facturas ({id_peticion[:8]})")
        r = revisar(cerebro)
        cerrar_peticion(id_peticion, r)
        print(f"[hecho] {r.texto()}")
    except Exception as e:  # que una petición mala no pare la escucha
        print(f"[error] petición {id_peticion[:8]}: {e}")
        try:
            cerrar_peticion(id_peticion, None, f"El agente no ha podido revisar las facturas: {e}")
        except Exception:
            pass


def peticiones_pendientes() -> list[str]:
    respuesta = supabase("GET", "/rest/v1/peticion_agente?select=id_peticion&estado=eq.pendiente&order=fecha_pedida")
    return [p["id_peticion"] for p in comprobar(respuesta, "leer las peticiones pendientes").json()]


async def esperar_peticiones(cerebro):
    """Se queda esperando sin consultar nada: Supabase Realtime avisa de cada petición nueva."""
    from supabase import acreate_client  # solo hace falta en este modo

    cola: asyncio.Queue[str] = asyncio.Queue()
    cliente = await acreate_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    def al_llegar(cambio: dict):
        fila = (cambio.get("data") or {}).get("record") or cambio.get("new") or cambio.get("record") or {}
        if fila.get("id_peticion") and fila.get("estado") == "pendiente":
            cola.put_nowait(fila["id_peticion"])

    canal = cliente.channel("peticiones-agente")
    canal.on_postgres_changes("INSERT", schema="public", table="peticion_agente", callback=al_llegar)
    await canal.subscribe()

    # Las que se pidieron mientras el agente estaba apagado
    for id_peticion in peticiones_pendientes():
        cola.put_nowait(id_peticion)

    print("Esperando a que alguien pulse «Revisar facturas» en la pantalla Pedidos del CRM (Ctrl+C para parar)...")
    while True:
        id_peticion = await cola.get()
        # Las llamadas a la IA y a Supabase bloquean: se hacen en otro hilo para no cortar la escucha
        await asyncio.to_thread(atender, id_peticion, cerebro)


def comprobar_configuracion():
    faltan = [v for v in ("OPENROUTER_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") if not os.getenv(v)]
    if faltan:
        sys.exit(f"Faltan variables en agente/.env: {', '.join(faltan)}. Copia .env.example a .env y rellénalas.")


def main():
    parser = argparse.ArgumentParser(description="Agente lector de facturas")
    parser.add_argument("--una-vez", action="store_true", help="revisa una vez sin esperar al botón del CRM y termina")
    args = parser.parse_args()

    comprobar_configuracion()
    for carpeta in (ENTRADA, PROCESADAS, ERRORES):
        carpeta.mkdir(parents=True, exist_ok=True)
    cerebro = crear_cerebro()

    print(f"Agente listo. Modelo: {MODELO}. Carpeta: {ENTRADA}")
    if args.una_vez:
        print(f"Hecho: {revisar(cerebro).texto()}.")
        return
    try:
        asyncio.run(esperar_peticiones(cerebro))
    except KeyboardInterrupt:
        print("\nAgente parado.")


if __name__ == "__main__":
    main()
