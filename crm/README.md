# CRM Mi Mascota

CRM y Recursos Humanos de la clínica veterinaria. Diseño blanco y negro con modo claro y oscuro
(botón abajo a la izquierda, en el sidebar). Los colores solo indican el estado:
**verde** = bien, **amarillo / naranja** = en proceso, **rojo** = mal.

## Stack

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS 4 (tipografía Geist)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel

## Pantallas

**CRM**
- `/` — Inicio: fichar, citas de hoy y mañana, lo que hay que contestar, resumen por estado y avisos de RRHH
- `/oportunidades` — Lista (con barra de probabilidad) y tablero Kanban arrastrando tarjetas
- `/oportunidades/[id]` — Fases (Nuevo → Contactado → Presupuesto → Cita → Atendido o Descartado) e historial
- `/empresas`, `/empresas/[id]` — Empresas cliente, sus animales y sus oportunidades
- `/particulares`, `/particulares/[id]` — Personas y sus animales (un animal puede tener varios dueños)
- `/animales`, `/animales/[id]` — Todos los animales, sus dueños y su historial

**Recursos humanos**
- `/rrhh/empleados`, `/rrhh/empleados/[id]` — Ficha (nombre, foto, puesto), horario, vacaciones, check de inicio, evaluaciones y nóminas
- `/rrhh/fichajes` — Fichar entrada y salida; el administrador ve al equipo y corrige fichajes
- `/rrhh/vacaciones` — Pedir vacaciones; el administrador las aprueba o las rechaza
- `/rrhh/seleccion` — Procesos de admisión con el CV en PDF; al **contratar** se crea la ficha con su correo corporativo y su check de inicio
- `/rrhh/evaluaciones` — Nota del 1 al 5 y comentario cada trimestre
- `/rrhh/nominas` — El administrador sube el PDF y el trabajador lo firma dibujando su firma

Además: búsqueda rápida con **Ctrl + K**, notificaciones en la campana, exportar a CSV (Excel) y `POST /api/contacto`
para el formulario de la web.

## Permisos

| | Empleado | Administrador |
|---|---|---|
| CRM (crear y editar) | Sí | Sí |
| Borrar empresas, particulares, animales u oportunidades | No | Sí |
| Fichar, pedir vacaciones, firmar sus nóminas, ver sus evaluaciones | Sí | Sí |
| Conceder vacaciones, evaluar, contratar, subir nóminas, crear empleados | No | Sí |
| Ver horarios, vacaciones, evaluaciones y nóminas de los demás | No | Sí |

Los permisos están en la base de datos (RLS), no solo en las pantallas. Quién es quién se sabe por el correo:
el usuario de Supabase **Authentication** tiene que tener el mismo correo que su ficha en la tabla `empleado`,
y el campo `rol` de la ficha dice si es `admin` o `empleado`.

## Setup

### 1. Base de datos (Supabase)

1. Abre el **SQL Editor** de tu proyecto.
2. Copia y ejecuta `supabase/schema.sql` (tablas, triggers, permisos y carpetas de Storage).
3. Copia y ejecuta `supabase/datos_ejemplo.sql` (opcional, pero recomendado para probar).
4. En **Authentication → Users → Add user** crea los usuarios con *Auto Confirm User* marcado:
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
│   └── api/contacto/route.ts ← recibe el formulario de la web
├── components/
│   ├── layout/               ← AppShell, Sidebar, Header, ThemeToggle, BuscadorRapido, Notificaciones
│   ├── ui/                   ← piezas genéricas: Modal, Etiqueta, Avatar, BarraProbabilidad, FiltroPastilla…
│   ├── crm/                  ← formularios y listas de oportunidades, empresas, particulares y animales
│   └── rrhh/                 ← fichar, check de inicio, vacaciones, evaluaciones, nóminas, candidatos…
├── hooks/                    ← useSesion, useConsulta, useAviso, useTema, useTituloPagina, useCatalogos…
├── lib/
│   ├── supabase/client.ts    ← cliente del navegador
│   ├── supabase/server.ts    ← cliente del servidor (api/contacto)
│   ├── utils.ts              ← formato de fechas, dinero, nombres, CSV
│   ├── crm-utils.ts          ← estados, colores y consultas del CRM
│   ├── rrhh-utils.ts         ← vacaciones, fichajes, evaluaciones, nóminas
│   └── archivos.ts           ← subir y abrir archivos de Storage
├── types/index.ts            ← una interfaz por tabla, con los mismos nombres de columna
└── supabase/
    ├── schema.sql            ← toda la base de datos
    └── datos_ejemplo.sql
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

El dominio de los correos corporativos se cambia en la función `dominio_correo()` de `schema.sql`.

## Formulario de la web → CRM

`POST /api/contacto` acepta JSON o un formulario normal con los campos `name`, `email`, `phone`, `petType`,
`petName`, `message` y `privacy` (también en español: `nombre`, `telefono`, `tipo_mascota`, `nombre_mascota`…).
Nombre, email válido, teléfono (9 cifras), tipo y nombre de la mascota y mensaje son obligatorios.
Tiene campo trampa anti-spam (`website`), límite de 5 envíos por minuto e IP y CORS con `ALLOWED_ORIGINS`.

## Vercel

Proyecto con **Root Directory `crm`** y las cuatro variables de entorno de arriba. En `ALLOWED_ORIGINS` pon
también la URL de la web publicada, separada por una coma.
