"""
Agente lector de facturas (Mi Mascota).

Lee facturas de dos sitios y guarda sus datos en la tabla facturas de Supabase:
  - la carpeta facturas/entrada: facturas de proveedores (PDF o foto) -> tipo "recibida";
  - el bucket "pedidos" de Supabase Storage: el PDF de cada pedido de venta que se confirma
    en el CRM (los presupuestos no llegan nunca) -> tipo "emitida", enlazada a la venta.

Con cada documento:
  1. el agente se lo pasa a la IA (Gemini, Claude... por la API de OpenRouter) con unas instrucciones fijas;
  2. la IA lo lee y pide usar la herramienta guardar_factura con los datos en JSON;
  3. el agente ejecuta guardar_factura: POST a la API REST de Supabase -> INSERT en la tabla facturas;
  4. fin: no se vuelve a preguntar a la IA.

La IA nunca toca la base de datos: solo decide y devuelve los datos; quien guarda es el agente.
Cada documento es una conversación nueva (no hace falta recordar los anteriores).

Uso:
  python agente.py              se queda encendido vigilando la carpeta y los pedidos
  python agente.py --una-vez    procesa lo que haya pendiente y termina
"""

import argparse
import base64
import mimetypes
import os
import shutil
import sys
import time
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
ESPERA = float(os.getenv("ESPERA_SEGUNDOS", "5"))
BUCKET_PEDIDOS = "pedidos"  # el CRM deja aquí <id_venta>.pdf al confirmar un pedido

ENTRADA = CARPETA / "entrada"
PROCESADAS = CARPETA / "procesadas"
ERRORES = CARPETA / "error"

IMAGENES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ADMITIDOS = IMAGENES | {".pdf"}

FORMATO = """Formato: la fecha como AAAA-MM-DD; los importes como números con punto decimal y sin símbolo (1234.50).
El IVA es el importe del impuesto, no el porcentaje."""

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


def a_instante(texto: Optional[str]) -> datetime:
    """Fecha y hora de Supabase ("2026-10-29T10:00:00.123+00:00" o "...Z")."""
    if not texto:
        return datetime.min.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(texto.replace("Z", "+00:00"))


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
    # 3. el agente ejecuta guardar_factura -> INSERT en Supabase
    guardada = guardar_factura.invoke({**datos, "archivo": nombre, **inyectados})
    # 4. fin: no se vuelve a preguntar a la IA
    return guardada


def resumen(fila: dict) -> str:
    quien = fila.get("cliente") if fila.get("tipo") == "emitida" else fila.get("proveedor")
    return f"{fila.get('numero') or '(sin número)'} de {quien or '(sin nombre)'}, total {fila.get('total')}"


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


def revisar_carpeta(cerebro) -> int:
    hechas = 0
    for ruta in pendientes():
        if ruta.suffix.lower() not in ADMITIDOS:
            mover(ruta, ERRORES)
            print(f"[error] {ruta.name}: formato no admitido (solo PDF, JPG, PNG, WEBP o GIF)")
            continue
        print(f"[leyendo] {ruta.name}")
        try:
            fila = leer_y_guardar(ruta.name, ruta.read_bytes(), cerebro, INSTRUCCIONES, "la factura", tipo="recibida")
        except FacturaRepetida as e:
            mover(ruta, ERRORES)
            print(f"[repetida] {ruta.name}: {e}")
            continue
        except Exception as e:  # que una factura mala no pare al agente
            mover(ruta, ERRORES)
            print(f"[error] {ruta.name}: {e}")
            continue
        mover(ruta, PROCESADAS)
        hechas += 1
        print(f"[INSERT] {ruta.name} -> factura recibida {resumen(fila)}")
    return hechas


# --- Facturas emitidas: los pedidos confirmados en el CRM (bucket "pedidos") ---

# PDF de pedidos que han fallado, para no repetir el error cada pocos segundos (se reintentan si el PDF cambia)
fallidos: set[tuple[str, str]] = set()


def pdfs_de_pedidos() -> list[dict]:
    respuesta = supabase("POST", f"/storage/v1/object/list/{BUCKET_PEDIDOS}",
                         json={"prefix": "", "limit": 1000, "offset": 0, "sortBy": {"column": "updated_at", "order": "asc"}})
    return [o for o in comprobar(respuesta, "listar los PDF de pedidos").json() if o["name"].endswith(".pdf")]


def emitidas_guardadas() -> dict[str, datetime]:
    """id_venta -> cuándo se leyó su PDF por última vez."""
    respuesta = supabase("GET", "/rest/v1/facturas?select=id_venta_fk,fecha_alta&tipo=eq.emitida&id_venta_fk=not.is.null")
    return {f["id_venta_fk"]: a_instante(f["fecha_alta"]) for f in comprobar(respuesta, "leer las facturas emitidas").json()}


def ventas_en_pedido(ids: list[str]) -> dict[str, int]:
    """De esas ventas, las que siguen siendo un pedido (los presupuestos y los cancelados no se leen): id -> número."""
    respuesta = supabase("GET", f"/rest/v1/venta?select=id_venta,numero&estado=eq.pedido&id_venta=in.({','.join(ids)})")
    return {v["id_venta"]: v["numero"] for v in comprobar(respuesta, "comprobar los pedidos").json()}


def revisar_pedidos(cerebro) -> int:
    guardadas = emitidas_guardadas()
    nuevos = []
    for o in pdfs_de_pedidos():
        id_venta, cambiado = o["name"][:-4], o.get("updated_at") or o.get("created_at")
        if id_venta in guardadas and guardadas[id_venta] >= a_instante(cambiado):
            continue  # ya leído y no ha cambiado desde entonces
        if (o["name"], cambiado) not in fallidos:
            nuevos.append((o["name"], id_venta, cambiado))
    if not nuevos:
        return 0

    pedidos = ventas_en_pedido([n[1] for n in nuevos])
    hechas = 0
    for nombre, id_venta, cambiado in nuevos:
        if id_venta not in pedidos:
            continue  # se canceló o volvió a presupuesto después de confirmarse
        codigo = f"V-{pedidos[id_venta]:04d}"
        print(f"[leyendo] pedido {codigo} ({nombre})")
        try:
            contenido = comprobar(supabase("GET", f"/storage/v1/object/{BUCKET_PEDIDOS}/{nombre}"), "descargar el PDF").content
            fila = leer_y_guardar(f"pedido-{codigo}.pdf", contenido, cerebro, INSTRUCCIONES_PEDIDO, "el pedido",
                                  tipo="emitida", id_venta=id_venta)
        except Exception as e:  # que un pedido malo no pare al agente
            fallidos.add((nombre, cambiado))
            print(f"[error] pedido {codigo}: {e}")
            continue
        hechas += 1
        print(f"[INSERT] pedido {codigo} -> factura emitida {resumen(fila)}")
    return hechas


def una_pasada(cerebro) -> int:
    hechas = revisar_carpeta(cerebro)
    try:
        hechas += revisar_pedidos(cerebro)
    except Exception as e:  # sin conexión con Supabase: se vuelve a intentar en la siguiente pasada
        print(f"[error] pedidos: {e}")
    return hechas


def comprobar_configuracion():
    faltan = [v for v in ("OPENROUTER_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") if not os.getenv(v)]
    if faltan:
        sys.exit(f"Faltan variables en agente/.env: {', '.join(faltan)}. Copia .env.example a .env y rellénalas.")


def main():
    parser = argparse.ArgumentParser(description="Agente lector de facturas")
    parser.add_argument("--una-vez", action="store_true", help="procesa lo que haya pendiente y termina")
    args = parser.parse_args()

    comprobar_configuracion()
    for carpeta in (ENTRADA, PROCESADAS, ERRORES):
        carpeta.mkdir(parents=True, exist_ok=True)
    cerebro = crear_cerebro()

    print(f"Agente listo. Modelo: {MODELO}. Vigilando: {ENTRADA} y los pedidos confirmados del CRM")
    if args.una_vez:
        n = una_pasada(cerebro)
        print(f"Hecho: {n} {'factura guardada' if n == 1 else 'facturas guardadas'}.")
        return
    try:
        while True:
            una_pasada(cerebro)
            time.sleep(ESPERA)
    except KeyboardInterrupt:
        print("\nAgente parado.")


if __name__ == "__main__":
    main()
