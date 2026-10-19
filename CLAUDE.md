# Mi Mascota - Web + CRM (proyecto de clase, 2.º DAM, ERP/CRM)

Responde siempre en español.

## Estructura

- `web/` - web pública de la clínica (Next.js, JavaScript). Puerto 3000.
- `crm/` - CRM (Next.js 16 + React 19 + TypeScript + Tailwind v4 + Supabase). Puerto 3001.
- Raíz: `npm install` instala las dos (postinstall). `npm run dev` arranca las dos a la vez; `npm run dev:web` / `npm run dev:crm` por separado.
- El formulario de contacto de la web (`web/components/sections/Contact.jsx`) envía a `POST {NEXT_PUBLIC_CRM_URL}/api/contacto` del CRM (`crm/app/api/contacto`). El CRM solo acepta los orígenes de `ALLOWED_ORIGINS`.
- Base de datos: `crm/supabase/schema.sql` (tablas, RLS con `es_admin()` / `mi_empleado()`, RPC `firmar_nomina` y `contratar_candidato`, trigger `vincular_cliente`, buckets de Storage) y `crm/supabase/datos_ejemplo.sql`.
- Despliegue: Vercel, dos proyectos desde el mismo repo (Root Directory `web` y `crm`).

## Normas que no se negocian

- NUNCA emojis, ni en la interfaz ni en el código ni en los mensajes.
- `.env.local` nunca va a git ni a ningún zip. Las claves no son sensibles (proyecto de clase), pero no se suben.
- No hacer push a repos de compañeros (el remoto antiguo `Panaiaio/crm-mimascota` puede ser de un compañero). Solo al repo propio.
- No tocar cambios que haya hecho el usuario sin preguntar antes.
- Antes de un cambio grande, que el usuario haga commit (o hacerlo tú si lo pide) para poder volver atrás.
- Hacer commit o push solo cuando el usuario lo pida.

## Reglas de diseño del CRM (decididas por el usuario)

- Prohibida la barra de desplazamiento horizontal en cualquier pantalla y anchura (la vertical sí). Las tablas ocultan columnas con container queries (`@container` + `@min-[Npx]:table-cell`) en vez de desbordar. Sin "mega huecos" entre columnas.
- Estados SIN cajita alrededor: texto gris apagado por defecto; "Atendido" en verde; "Descartado" en rojo (también en la gráfica). Nada en gris apagado lleva recuadro.
- "Vencido" y "descarte" son lo mismo: se llama "Descartado".
- Botones principales en blanco/negro (negro en claro, blanco en oscuro). Nunca azul.
- Estrellas siempre amarillas.
- Colores con significado: verde = bien, rojo = error/peligro, amarillo = aviso.
- Inicio: cifras en negro. En "Lo tuyo", "Ninguna" en gris apagado y lo que haya en negro normal, sin cuadrito.
- Empleados: la etiqueta "admin" en un color que resalte.
- Oportunidades: la vista tablero se llama "Pipeline" y ocupa toda la pantalla. El menú de los tres puntos no tiene "Mover"; el estado se cambia desde "Editar".
- Selección: todos los procesos en un único tablero (sin recuadros por proceso); el proceso se elige en el formulario del candidato.
- Logo: `crm/public/logo.png` (fondo transparente), favicon `crm/app/icon.png`.

## Guía UX (skill "ux-y-ui" del curso)

Se aplica a todo: contraste 4.5:1; objetivos táctiles de 44 px; espaciado en múltiplos de 8; etiqueta visible encima de cada campo; errores junto al campo diciendo cómo arreglarlo (con icono, no solo color); formularios largos por pasos; buscador en listas de más de 10 elementos; un solo botón principal por pantalla; confirmaciones que nombran el elemento y la consecuencia con un botón específico ("Eliminar empresa", no "Aceptar"); avisos con "Ver"/"Deshacer"; estados vacíos con una acción; fechas dd/mm/aaaa; importes 1.234,50 €; migas de pan en la cabecera.

## Estado a 19/10/2026

- Hay una revisión UX completa terminada pero SIN aplicar: `Documents\Development\revision-ux.zip` (73 archivos con su estructura de carpetas, lista en `CAMBIOS-UX.txt` dentro). Se aplica descomprimiendo encima de `crm-mimascota` y reemplazando. Antes: commit del estado actual para poder volver con `git checkout -- .` (y borrar los 3 archivos nuevos: `crm/components/ui/SelectorBuscable.tsx`, `Pasos.tsx`, `BuscadorPastilla.tsx`).
- Lo que incluye: componentes `Campo` con errores por campo, `SelectorBuscable` (buscar con "+ Crear…"), `Pasos`, `BuscadorPastilla`; formularios de oportunidad (3 pasos) y empleado (2 pasos); confirmaciones y avisos reescritos con Deshacer; `formatEUR`/`formatNumero` con punto de miles; fechas dd/mm/aaaa; Inicio con comparaciones (▲/▼); todo a 44 px; web con errores del formulario que explican cómo arreglarlos.
- Cambios de criterio que trae la revisión (por si al usuario no le convencen): el gris apagado es algo más oscuro; las fechas salen 16/10/2026; en Oportunidades las columnas Animal y Responsable solo aparecen en pantallas anchas.
