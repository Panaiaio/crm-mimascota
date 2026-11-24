# CRM Mi Mascota

CRM y Recursos Humanos de la clínica veterinaria. Diseño blanco y negro con modo claro y oscuro
(botón arriba a la derecha, junto a cerrar sesión). El menú lateral se pliega con su botón y cada apartado
(CRM, Recursos humanos) se despliega o se recoge con su flecha.

Los colores solo indican algo cuando hace falta: **verde** = bien, **amarillo** = aviso, **rojo** = error.
Los estados nunca llevan recuadro: Atendido en verde, Descartado (también un seguimiento que se ha pasado de fecha) en rojo y el resto en gris.

## Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS 4 (tipografía Geist) + Recharts (gráficas) + fflate (zip de las webs exportadas)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Pruebas**: Vitest (`npm test`) para la lógica pura del creador de webs
- **Deploy**: Vercel

## Pantallas

**CRM**
- `/` — Inicio: fichar, ventas del mes, citas de hoy y mañana, lo que hay que contestar, tus presupuestos pendientes, avisos de RRHH y gráfica de oportunidades por estado (Recharts)
- `/oportunidades` — Lista (con barra de probabilidad) y Pipeline (Kanban a pantalla completa, arrastrando tarjetas). El estado también se cambia desde Editar
- `/oportunidades/[id]` — Fases (Nuevo → Contactado → Presupuesto → Cita → Atendido o Descartado) e historial
- `/empresas`, `/empresas/[id]` — Empresas cliente, sus animales y sus oportunidades
- `/particulares`, `/particulares/[id]` — Personas y sus animales (un animal puede tener varios dueños)
- `/animales`, `/animales/[id]` — Todos los animales, sus dueños y su historial

**Ventas**
- `/ventas/presupuestos` — Presupuestos abiertos, enviados y cancelados, con su comercial, su validez y el total con IVA
- `/ventas/presupuestos/[id]` — Ficha del presupuesto: cliente, líneas del catálogo con descuento e IVA, y los pasos Enviar → Confirmar pedido (o Cancelar)
- `/ventas/pedidos` — Pedidos de venta confirmados, por mes (este mes, mes pasado o todos)
- `/ventas/productos` — Catálogo de productos y servicios con su precio sin IVA, su tipo de IVA y su categoría

**Recursos humanos**
- `/rrhh/empleados`, `/rrhh/empleados/[id]` — Ficha (nombre, foto, puesto), horario, vacaciones, check de inicio, evaluaciones y nóminas
- `/rrhh/fichajes` — Fichar entrada y salida; el administrador ve al equipo y corrige fichajes
- `/rrhh/vacaciones` — Pedir vacaciones; el administrador las aprueba o las rechaza
- `/rrhh/seleccion` — Procesos de admisión con el CV en PDF; al **contratar** se crea la ficha con su correo corporativo y su check de inicio
- `/rrhh/evaluaciones` — Nota del 1 al 5 y comentario cada trimestre
- `/rrhh/nominas` — El administrador sube el PDF y el trabajador lo firma dibujando su firma

**Web** (creador de webs con bloques)
- `/web` — Mis webs: pestañas Mías, Ajenas y Todas, con buscador cuando hay más de 10
- `/web/nueva` — Nueva web a partir de una plantilla (negocio, portfolio, evento o vacía) y una paleta de colores
- `/web/[id]` — Editor: vista previa (ordenador o móvil), bloques que se añaden, mueven y borran, panel de campos y
  «Ajustes de la web». Todo se guarda solo (borrador). Varias personas editan a la vez: se ven los avatares y lo
  que otra persona está editando queda bloqueado. «Ver colaboradores» gestiona quién entra, cambia el dueño
  (administradores) y elimina la web. «Exportar» descarga un `.zip` con la web en HTML y CSS, sin JavaScript

Además: búsqueda rápida con **Ctrl + K**, notificaciones en la campana, exportar a CSV (Excel) y `POST /api/contacto`
para el formulario de la web.

## Permisos

| | Empleado | Administrador |
|---|---|---|
| CRM (crear y editar) | Sí | Sí |
| Borrar empresas, particulares, animales u oportunidades | No | Sí |
| Ver presupuestos y pedidos; crear y editar presupuestos mientras están abiertos | Sí | Sí |
| Enviar, confirmar o cancelar un presupuesto | Sí | Sí |
| Cancelar un pedido confirmado | No | Sí |
| Borrar presupuestos (solo si están en Presupuesto o Cancelado) | No | Sí |
| Cambiar el catálogo de productos y servicios | No | Sí |
| Fichar, pedir vacaciones, firmar sus nóminas, ver sus evaluaciones | Sí | Sí |
| Conceder vacaciones, evaluar, contratar, subir nóminas, crear empleados | No | Sí |
| Ver horarios, vacaciones, evaluaciones y nóminas de los demás | No | Sí |

En cada web hay un **dueño** (quien la crea), **editores** y **lectores**:

| En una web | Dueño | Editor | Lector | Administrador (sin ser dueño) |
|---|---|---|---|---|
| Verla y exportarla | Sí | Sí | Sí | Sí |
| Cambiar bloques, nombre, ajustes y paleta | Sí | Sí | No | Sí |
| Añadir y quitar colaboradores, cambiar su permiso | Sí | No | No | Sí |
| Eliminar la web | Sí | No | No | Sí |
| Cambiar el dueño | No (salvo que sea administrador) | No | No | Sí |

Como mucho **3 editores contando al dueño** y **6 personas contando al dueño**. Los administradores no cuentan
(salvo que sean los dueños) y no se pueden añadir como colaboradores, porque ya ven y editan todas las webs.

Los permisos están en la base de datos (RLS), no solo en las pantallas. Quién es quién se sabe por el correo:
el usuario de Supabase **Authentication** tiene que tener el mismo correo que su ficha en la tabla `empleado`,
y el campo `rol` de la ficha dice si es `admin` o `empleado`.

## Setup

### 1. Base de datos (Supabase)

1. Abre el **SQL Editor** de tu proyecto.
2. Copia y ejecuta `supabase/schema.sql` (tablas, triggers, permisos y carpetas de Storage).
3. Copia y ejecuta `supabase/ventas.sql` (módulo Ventas: catálogo, presupuestos y pedidos). Va siempre después de `schema.sql`
   y no borra nada, así que se puede volver a ejecutar.
4. Copia y ejecuta `supabase/webs.sql` (creador de webs: tablas, permisos, carpeta privada `webs` de Storage y
   canal privado de Realtime). Va después de `schema.sql` y no borra nada.
   Para probarlo, ejecuta en una sola consulta `BEGIN;`, el contenido de `webs.sql`, el de `supabase/webs_prueba.sql`
   y `ROLLBACK;`: si todo va bien termina con `webs_prueba: OK` y no se guarda nada.
5. Copia y ejecuta `supabase/datos_ejemplo.sql` (opcional, pero recomendado para probar) y, después,
   `supabase/ventas_datos_ejemplo.sql` (opcional: presupuestos y pedidos de prueba).
6. En **Authentication → Users → Add user** crea los usuarios con *Auto Confirm User* marcado:
   - `prueba@gmail.com` → Laura, administradora
   - `recepcion@mimascota.es` → Elena, empleada

Para un trabajador nuevo: créale la ficha en **Empleados** (o contrátalo desde **Selección**) y después crea en
Authentication un usuario con el mismo correo.

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y rellénalo (Supabase → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_NOMBRE_EMPRESA=Mi Mascota
ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Instalar y arrancar

```bash
npm install
npm run dev
```

Abre [http://localhost:3001](http://localhost:3001)

Pruebas de la lógica del creador de webs (Vitest):

```bash
npm test
```

## Estructura

```
crm/
├── app/                      ← solo páginas (una carpeta por ruta)
│   ├── layout.tsx            ← monta AppShell (sidebar + cabecera) alrededor de todas las páginas
│   ├── globals.css           ← colores del modo claro/oscuro y clases reutilizables (btn-primario, input, tabla…)
│   ├── page.tsx              ← Inicio
│   ├── auth/login/
│   ├── oportunidades/  empresas/  particulares/  animales/   (lista y [id] = ficha)
│   ├── rrhh/empleados/  fichajes/  vacaciones/  seleccion/  evaluaciones/  nominas/
│   ├── ventas/presupuestos/  pedidos/  productos/
│   ├── web/                  ← Mis webs, nueva y [id] = editor
│   └── api/contacto/route.ts ← recibe el formulario de la web
├── components/
│   ├── layout/               ← AppShell, Sidebar, Header, ThemeToggle, BuscadorRapido, Notificaciones
│   ├── ui/                   ← piezas genéricas: Modal, Etiqueta, Avatar, BarraProbabilidad, FiltroPastilla…
│   ├── crm/                  ← formularios y listas de oportunidades, empresas, particulares y animales
│   ├── rrhh/                 ← fichar, check de inicio, vacaciones, evaluaciones, nóminas, candidatos…
│   ├── ventas/               ← formularios, listas y celdas de presupuestos, pedidos y productos
│   └── web/                  ← tarjetas, selector de paleta y la web generada (Sitio)
│       ├── bloques/          ← un archivo por tipo de bloque: campos, contenido por defecto y su HTML
│       └── editor/           ← editor, paneles, colaboradores y estado (useEditorWeb)
├── hooks/                    ← useSesion, useConsulta, useAviso, useTema, useTituloPagina, useCatalogos…
│                               useColaboracion: edición en vivo (presencia, bloqueos y cambios de los demás)
├── lib/
│   ├── supabase/client.ts    ← cliente del navegador
│   ├── supabase/server.ts    ← cliente del servidor (api/contacto)
│   ├── utils.ts              ← formato de fechas, dinero, nombres, CSV
│   ├── crm-utils.ts          ← estados, colores y consultas del CRM
│   ├── rrhh-utils.ts         ← vacaciones, fichajes, evaluaciones, nóminas
│   ├── ventas-utils.ts       ← estados de una venta, importes con IVA y filtros de presupuestos y pedidos
│   ├── archivos.ts           ← subir y abrir archivos de Storage
│   └── web/                  ← datos del creador de webs, paletas y contraste, guardado, presencia, exportar (con pruebas *.test.ts)
├── types/index.ts            ← una interfaz por tabla, con los mismos nombres de columna
└── supabase/
    ├── schema.sql            ← toda la base de datos
    ├── ventas.sql            ← módulo Ventas (después de schema.sql)
    ├── webs.sql              ← creador de webs (después de schema.sql)
    ├── webs_prueba.sql       ← comprobaciones de webs.sql (dentro de BEGIN … ROLLBACK)
    ├── datos_ejemplo.sql
    └── ventas_datos_ejemplo.sql
```

**Cómo se conecta:** cada página es un componente de cliente que pide sus datos a Supabase con
`useConsulta` (que usa `createClient()` de `lib/supabase/client`). `AppShell` comprueba la sesión, carga la
ficha del empleado que ha entrado y la reparte con `useSesion()` (así cada página sabe si es administrador).
Los formularios están en `components/crm` y `components/rrhh` y se abren como ventanas modales.

**Base de datos:** tablas en singular y snake_case, clave `id_<tabla>` y claves foráneas `id_<x>_fk`.
Lo automático lo hacen triggers y funciones:

| Qué | Dónde |
|---|---|
| Asociar lo que llega de la web a la persona (por correo o teléfono) y a su animal | trigger `vincular_cliente` |
| Probabilidad según el estado e historial de cambios | triggers `preparar_oportunidad` y `registrar_actividad` |
| Un animal de empresa no puede tener dueños particulares | triggers `comprobar_animal_*` |
| Check de inicio al crear un empleado | trigger `crear_tareas_inicio` |
| Días laborables de unas vacaciones | trigger `preparar_vacacion` |
| Fichar entrada/salida | función `fichar()` |
| Contratar: ficha + correo `nombre.apellido@mimascota.es` + check de inicio | función `contratar_candidato()` |
| Firmar una nómina (solo su dueño y una vez) | función `firmar_nomina()` |
| Estados de una venta, fechas de envío y confirmación, e importes sumados de las líneas | triggers `preparar_venta`, `preparar_linea_venta` y `recalcular_venta` (`ventas.sql`) |
| Apuntar cada paso de la venta en la oportunidad vinculada | trigger `ventas_a_oportunidad` (`ventas.sql`) |
| Papel de cada persona en una web (dueño, administrador, editor o lector) | función `rol_en_web()` (`webs.sql`) |
| Límites de colaboradores (3 editores y 6 personas contando al dueño) | trigger `comprobar_colaborador` (`webs.sql`) |
| Cambiar el dueño de una web (solo administradores) | función `cambiar_dueno()` (`webs.sql`) |

El dominio de los correos corporativos se cambia en la función `dominio_correo()` de `schema.sql`.

## Formulario de la web → CRM

`POST /api/contacto` acepta JSON o un formulario normal con los campos `name`, `email`, `phone`, `petType`,
`petName`, `message` y `privacy` (también en español: `nombre`, `telefono`, `tipo_mascota`, `nombre_mascota`…).
Nombre, email válido, teléfono (9 cifras), tipo y nombre de la mascota y mensaje son obligatorios.
Tiene campo trampa anti-spam (`website`), límite de 5 envíos por minuto e IP y CORS con `ALLOWED_ORIGINS`.

## Vercel

Proyecto con **Root Directory `crm`** y las cuatro variables de entorno de arriba. En `ALLOWED_ORIGINS` pon
también la URL de la web publicada, separada por una coma.
