# Agente lector de facturas

Programa en Python con LangChain que vigila una carpeta y, con cada factura que llega (PDF o foto), saca sus datos con una IA (por defecto Gemini 2.5 Flash, a través de OpenRouter) y los guarda en la tabla `facturas` del Supabase del CRM.

## Cómo funciona

```
facturas/entrada  ->  agente.py  ->  IA (OpenRouter)
                          |               |
                          |   <- "usa guardar_factura con estos datos" (JSON)
                          v
                    guardar_factura  ->  POST /rest/v1/facturas  ->  INSERT en Supabase
                          |
                          v
               facturas/procesadas (o facturas/error)
```

Con cada factura:

1. El agente le pasa a la IA la factura tal cual (un PDF o una foto, que la IA lee con visión) y unas instrucciones fijas.
2. La IA devuelve los datos pidiendo usar la herramienta `guardar_factura`: número, fecha, proveedor, NIF, base imponible, IVA y total. Si un dato no aparece lo deja vacío; no inventa nada.
3. El agente ejecuta `guardar_factura`, que hace el POST a la API REST de Supabase. Supabase lo convierte en un INSERT.
4. Fin. No se vuelve a preguntar a la IA, y la siguiente factura empieza de cero (no hace falta memoria).

La IA nunca toca la base de datos: solo decide y devuelve los datos. Quien guarda es el agente.

## Puesta en marcha

1. **Tabla en Supabase** (solo la primera vez): en el SQL Editor del proyecto del CRM ejecuta `crm/supabase/facturas.sql`. No borra nada, se puede repetir.
2. **Clave de OpenRouter**: créala en https://openrouter.ai/keys.
3. **Configuración**: copia `.env.example` a `.env` y rellena `OPENROUTER_API_KEY`, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (los dos últimos son los mismos que `crm/.env.local`). `.env` no se sube a git.
4. **Instalar** (desde la carpeta `agente/`):

```bash
py -m venv .venv
```

```bash
.venv/Scripts/python -m pip install -r requirements.txt
```

5. **Arrancar**:

```bash
.venv/Scripts/python agente.py
```

Se queda encendido mirando `facturas/entrada` cada 5 segundos (`ESPERA_SEGUNDOS`). Para procesar lo que haya y terminar: `agente.py --una-vez`. Para pararlo: Ctrl+C.

## Carpetas

| Carpeta | Qué hay |
|---|---|
| `facturas/entrada` | Donde se dejan las facturas nuevas (PDF, JPG, PNG, WEBP o GIF) |
| `facturas/procesadas` | Las que se han guardado bien |
| `facturas/error` | Formato no admitido, factura repetida (mismo número y NIF) o fallo al leerla. El motivo sale en la consola |

Las facturas no se suben a git; solo la estructura de carpetas.

## Detalles

- **Modelo**: `google/gemini-2.5-flash` por defecto (barato y lee PDF e imágenes). Cambiar de modelo es cambiar `MODELO` en `.env`, por ejemplo a `anthropic/claude-sonnet-5.5`.
- **Herramienta** `guardar_factura(numero, fecha, proveedor, nif, base, iva, total)`. El nombre del fichero (`archivo`) lo añade el agente; la IA no lo ve.
- **Limpieza**: fechas a AAAA-MM-DD (también acepta dd/mm/aaaa) e importes a número (también acepta `1.234,50`).
- **Seguridad**: el agente escribe con la clave `service_role`, así que solo debe ejecutarse en el servidor. En el CRM, la tabla `facturas` solo la ve un administrador (RLS con `es_admin()`).
