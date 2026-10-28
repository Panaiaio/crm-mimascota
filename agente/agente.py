"""
Agente lector de facturas (Mi Mascota).

Vigila la carpeta facturas/entrada. Con cada factura (PDF o foto):
  1. el agente se la pasa a la IA (Gemini, Claude... por la API de OpenRouter) con unas instrucciones fijas;
  2. la IA la lee y pide usar la herramienta guardar_factura con los datos en JSON;
  3. el agente ejecuta guardar_factura: POST a la API REST de Supabase -> INSERT en la tabla facturas;
  4. fin: no se vuelve a preguntar a la IA. La factura pasa a facturas/procesadas.

La IA nunca toca la base de datos: solo decide y devuelve los datos; quien guarda es el agente.
Cada factura es una conversación nueva (no hace falta recordar las anteriores).

Uso:
  python agente.py              se queda encendido vigilando la carpeta
  python agente.py --una-vez    procesa lo que haya en la carpeta y termina
"""

import argparse
import base64
import mimetypes
import os
import shutil
import sys
import time
from datetime import datetime
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

ENTRADA = CARPETA / "entrada"
PROCESADAS = CARPETA / "procesadas"
ERRORES = CARPETA / "error"

IMAGENES = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ADMITIDOS = IMAGENES | {".pdf"}

# Instrucciones fijas que recibe la IA con cada factura. Son siempre las mismas.
INSTRUCCIONES = """Eres un asistente de administración.
Lee la factura que te paso (PDF o foto).
Saca: número, fecha, proveedor, NIF, base imponible, IVA y total.
Si un dato no aparece, déjalo vacío.
No inventes nada.
Cuando lo tengas, llama a guardar_factura.

Formato: la fecha como AAAA-MM-DD; los importes como números con punto decimal y sin símbolo (1234.50).
El IVA es el importe del impuesto, no el porcentaje."""


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
# Herramienta: guardar_factura
# La IA solo pide usarla con un JSON; quien la ejecuta, y hace el INSERT, es el agente.
# ------------------------------------------------------------

def insertar_en_supabase(fila: dict) -> dict:
    """POST a /rest/v1/facturas: Supabase lo convierte en un INSERT."""
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/facturas"
    clave = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    respuesta = requests.post(
        url,
        json=fila,
        headers={
            "apikey": clave,
            "Authorization": f"Bearer {clave}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        timeout=30,
    )
    if respuesta.status_code == 409:
        raise FacturaRepetida(f"ya está guardada la factura {fila.get('numero')} de {fila.get('proveedor')}")
    if not respuesta.ok:
        raise RuntimeError(f"Supabase respondió {respuesta.status_code}: {respuesta.text[:300]}")
    return respuesta.json()[0]


@tool
def guardar_factura(
    numero: Optional[str] = None,
    fecha: Optional[str] = None,
    proveedor: Optional[str] = None,
    nif: Optional[str] = None,
    base: Optional[float] = None,
    iva: Optional[float] = None,
    total: Optional[float] = None,
    archivo: Annotated[str, InjectedToolArg] = "",
) -> dict:
    """Guarda una factura en Supabase.

    Args:
        numero: número de la factura tal como aparece.
        fecha: fecha de la factura en formato AAAA-MM-DD.
        proveedor: nombre de la empresa o persona que emite la factura.
        nif: NIF o CIF del proveedor.
        base: base imponible (importe antes de impuestos).
        iva: importe del IVA (no el porcentaje).
        total: importe total de la factura.
    """
    fila = {
        "numero": a_texto(numero),
        "fecha": a_fecha(fecha),
        "proveedor": a_texto(proveedor),
        "nif": a_texto(nif),
        "base": a_numero(base),
        "iva": a_numero(iva),
        "total": a_numero(total),
        "archivo": archivo,
    }
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


def mensaje_con_factura(ruta: Path) -> HumanMessage:
    """La factura tal cual (todavía no es JSON): un PDF o una foto, que la IA lee con visión."""
    tipo = mimetypes.guess_type(ruta.name)[0] or "application/octet-stream"
    datos = base64.b64encode(ruta.read_bytes()).decode()
    url_datos = f"data:{tipo};base64,{datos}"
    if ruta.suffix.lower() in IMAGENES:
        adjunto = {"type": "image_url", "image_url": {"url": url_datos}}
    else:
        adjunto = {"type": "file", "file": {"filename": ruta.name, "file_data": url_datos}}
    return HumanMessage(content=[{"type": "text", "text": f"Esta es la factura «{ruta.name}»."}, adjunto])


def procesar(ruta: Path, cerebro) -> dict:
    # 1. agente -> IA: "esta es la factura" (conversación nueva, sin memoria)
    respuesta = cerebro.invoke([SystemMessage(INSTRUCCIONES), mensaje_con_factura(ruta)])
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
    guardada = guardar_factura.invoke({**datos, "archivo": ruta.name})
    # 4. fin: no se vuelve a preguntar a la IA
    return guardada


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


def una_pasada(cerebro) -> int:
    hechas = 0
    for ruta in pendientes():
        if ruta.suffix.lower() not in ADMITIDOS:
            mover(ruta, ERRORES)
            print(f"[error] {ruta.name}: formato no admitido (solo PDF, JPG, PNG, WEBP o GIF)")
            continue
        print(f"[leyendo] {ruta.name}")
        try:
            fila = procesar(ruta, cerebro)
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
        print(f"[INSERT] {ruta.name} -> factura {fila.get('numero') or '(sin número)'} de "
              f"{fila.get('proveedor') or '(sin proveedor)'}, total {fila.get('total')}")
    return hechas


def comprobar_configuracion():
    faltan = [v for v in ("OPENROUTER_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY") if not os.getenv(v)]
    if faltan:
        sys.exit(f"Faltan variables en agente/.env: {', '.join(faltan)}. Copia .env.example a .env y rellénalas.")


def main():
    parser = argparse.ArgumentParser(description="Agente lector de facturas")
    parser.add_argument("--una-vez", action="store_true", help="procesa lo que haya en la carpeta y termina")
    args = parser.parse_args()

    comprobar_configuracion()
    for carpeta in (ENTRADA, PROCESADAS, ERRORES):
        carpeta.mkdir(parents=True, exist_ok=True)
    cerebro = crear_cerebro()

    print(f"Agente listo. Modelo: {MODELO}. Vigilando: {ENTRADA}")
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
