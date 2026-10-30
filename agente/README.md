# Agente lector de facturas

Programa en Python con LangChain que lee facturas, saca sus datos con una IA (por defecto Gemini 2.5 Flash, a través de OpenRouter) y los guarda en la tabla `facturas` del Supabase del CRM. Lee de dos sitios:

| De dónde | Qué es | Se guarda como |
|---|---|---|
| Carpeta `facturas/entrada` | Facturas de proveedores (PDF o foto) | `recibida` |
| Bucket `pedidos` de Supabase Storage | El PDF de cada pedido que se confirma en el CRM | `emitida`, enlazada a la venta |

Los presupuestos nunca llegan al agente: solo se sube el PDF de las ventas que son **pedido**.

**No vigila nada por su cuenta.** Trabaja cuando alguien pulsa **«Revisar facturas»** en la pantalla Pedidos del CRM (desde Vercel, en cualquier ordenador):

1. El CRM sube el PDF de los pedidos que aún no lo tengan en el bucket `pedidos` (el PDF solo lo sabe generar el CRM).
2. Deja una petición en la tabla `peticion_agente`. Supabase Realtime avisa al agente al momento (no hace consultas cada X segundos).
3. El agente comprueba qué facturas están ya en la base de datos: con esas no hace nada. Guarda solo las que falten, de los pedidos y de la carpeta.
4. Apunta el resultado en la petición y el CRM lo enseña: «Facturas revisadas: 2 facturas guardadas, 5 ya estaban en la base de datos».

Hay que tener el agente encendido **antes** de pulsar el botón. Si está apagado, el CRM lo avisa a los 15 segundos; al arrancar, el agente no hace esa petición vieja (la cierra sin revisar nada): solo trabaja cuando se pulsa el botón con él encendido.

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

Se queda encendido esperando el botón «Revisar facturas» del CRM, sin consultar nada mientras espera. Para revisar una vez sin el botón y terminar: `agente.py --una-vez`. Para pararlo: Ctrl+C.

## Carpetas

| Carpeta | Qué hay |
|---|---|
| `facturas/entrada` | Donde se dejan las facturas nuevas (PDF, JPG, PNG, WEBP o GIF) |
| `facturas/procesadas` | Las que se han guardado y las que ya estaban en la base de datos (mismo número y NIF) |
| `facturas/error` | Formato no admitido o fallo al leerla. El motivo sale en la consola y en el aviso del CRM |

Las facturas no se suben a git; solo la estructura de carpetas.

## Pedidos del CRM

1. El PDF de cada pedido está en `pedidos/<id_venta>.pdf`. El CRM lo sube al confirmar el pedido y, si falta alguno, al pulsar «Revisar facturas».
2. El agente salta los pedidos que ya tienen su factura en la base de datos y los que ya no son pedido (cancelados o vueltos a presupuesto).
3. Del resto guarda los datos como factura `emitida`: número del pedido (V-0012), fecha, quien emite (la clínica), cliente y su NIF, base, IVA y total, enlazada a la venta con `id_venta_fk`.

## Detalles

- **Modelo**: `google/gemini-2.5-flash` por defecto (barato y lee PDF e imágenes). Cambiar de modelo es cambiar `MODELO` en `.env`, por ejemplo a `anthropic/claude-sonnet-5.5`.
- **Herramienta** `guardar_factura(numero, fecha, proveedor, nif, cliente, nif_cliente, base, iva, total)`. El nombre del fichero (`archivo`), el tipo y la venta los añade el agente; la IA no los ve.
- **Limpieza**: fechas a AAAA-MM-DD (también acepta dd/mm/aaaa) e importes a número (también acepta `1.234,50`).
- **Seguridad**: el agente escribe con la clave `service_role`, así que solo debe ejecutarse en el servidor. En el CRM, la tabla `facturas` solo la ve un administrador (RLS con `es_admin()`).
