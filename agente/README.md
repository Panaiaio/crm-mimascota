# Agente lector de facturas

Programa en Python con LangChain que lee facturas, saca sus datos con una IA (por defecto Gemini 2.5 Flash, a través de OpenRouter) y los guarda en la tabla `facturas` del Supabase del CRM. Lee de dos sitios:

| De dónde | Qué es | Se guarda como |
|---|---|---|
| Carpeta `facturas/entrada` | Facturas de proveedores (PDF o foto) | `recibida` |
| Bucket `pedidos` de Supabase Storage | El PDF de cada pedido que se confirma en el CRM | `emitida`, enlazada a la venta |

Los presupuestos nunca llegan al agente: el CRM solo sube el PDF cuando una venta pasa a ser **pedido** (botón «Confirmar pedido»).

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

1. **Tabla y bucket en Supabase**: en el SQL Editor del proyecto del CRM ejecuta `crm/supabase/facturas.sql`, después de `schema.sql` y `ventas.sql`. No borra nada y se puede repetir (hay que volver a ejecutarlo cuando cambie).
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

Se queda encendido mirando la carpeta y los pedidos cada 5 segundos (`ESPERA_SEGUNDOS`). Para procesar lo que haya y terminar: `agente.py --una-vez`. Para pararlo: Ctrl+C.

## Carpetas

| Carpeta | Qué hay |
|---|---|
| `facturas/entrada` | Donde se dejan las facturas nuevas (PDF, JPG, PNG, WEBP o GIF) |
| `facturas/procesadas` | Las que se han guardado bien |
| `facturas/error` | Formato no admitido, factura repetida (mismo número y NIF) o fallo al leerla. El motivo sale en la consola |

Las facturas no se suben a git; solo la estructura de carpetas.

## Pedidos del CRM

1. En el CRM, al pulsar «Confirmar pedido», se genera el PDF del pedido y se sube a `pedidos/<id_venta>.pdf`. Si la subida falla, el pedido queda confirmado igualmente y se avisa; el PDF se vuelve a subir al descargarlo.
2. El agente mira el bucket y lee solo los PDF nuevos o que han cambiado desde la última vez, y solo si la venta sigue siendo un pedido (si se canceló o volvió a presupuesto, no la toca).
3. Guarda los datos como factura `emitida`: número del pedido (V-0012), fecha, quien emite (la clínica), cliente y su NIF, base, IVA y total, enlazada a la venta con `id_venta_fk`.
4. Si el pedido se cancela y se vuelve a confirmar, su fila se actualiza (no se duplica).

## Detalles

- **Modelo**: `google/gemini-2.5-flash` por defecto (barato y lee PDF e imágenes). Cambiar de modelo es cambiar `MODELO` en `.env`, por ejemplo a `anthropic/claude-sonnet-5.5`.
- **Herramienta** `guardar_factura(numero, fecha, proveedor, nif, cliente, nif_cliente, base, iva, total)`. El nombre del fichero (`archivo`), el tipo y la venta los añade el agente; la IA no los ve.
- **Limpieza**: fechas a AAAA-MM-DD (también acepta dd/mm/aaaa) e importes a número (también acepta `1.234,50`).
- **Seguridad**: el agente escribe con la clave `service_role`, así que solo debe ejecutarse en el servidor. En el CRM, la tabla `facturas` solo la ve un administrador (RLS con `es_admin()`).
