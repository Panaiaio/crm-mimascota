# Web Mi Mascota

Web pública de la clínica veterinaria. Es una sola página con estas secciones: portada, servicios, sobre nosotros,
especialidades, equipo, opiniones y contacto. El formulario de contacto envía los mensajes al CRM.

## Stack

- **Frontend**: Next.js 16 + React 19 (JavaScript)
- **Estilos**: CSS Modules (un `.module.css` al lado de cada componente) y variables en `app/globals.css`
- **Animaciones**: Framer Motion
- **Iconos**: lucide-react y react-icons
- **Deploy**: Vercel

## Setup

Copia `.env.example` a `.env.local`. En local no hace falta cambiar nada:

```
NEXT_PUBLIC_CRM_URL=http://localhost:3001
```

En Vercel, pon la URL del CRM publicado, sin `/` al final (por ejemplo `https://crm-mimascota.vercel.app`).

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Estructura

```
web/
├── app/
│   ├── layout.js             ← fuentes (Fraunces e Inter), título y metadatos
│   ├── page.js               ← la página: Navbar + secciones + Footer
│   ├── globals.css           ← variables de diseño (colores, tipografías, espacios) y estilos generales
│   └── icon.svg              ← icono de la pestaña
├── components/
│   ├── layout/               ← Navbar y Footer
│   ├── sections/             ← una sección de la página por archivo (Hero, Services, About…)
│   └── ui/                   ← piezas reutilizables: Button, Container, Logo, SectionHeading, Reveal y las tarjetas
├── data/
│   └── site.js               ← TODOS los textos, datos de contacto y rutas de las imágenes
├── lib/
│   └── motion.js             ← animaciones de Framer Motion (aparecer, deslizar…)
└── public/imagenes/
    ├── logo.png
    ├── portada/              ← foto de la portada y de "Sobre nosotros"
    ├── servicios/            ← iconos de los servicios
    ├── especialidades/       ← iconos de cachorros, adultos, senior y exóticos
    └── equipo/               ← fotos del equipo
```

**Cómo se conecta:** `app/page.js` monta las secciones en orden. Cada sección lee su contenido de `data/site.js`
y lo pinta con las piezas de `components/ui`. Para cambiar un texto, un teléfono o una foto se cambia en
`data/site.js` (las imágenes se guardan en `public/imagenes/…` y en `site.js` se pone su ruta).

## Cambios habituales

| Quiero… | Dónde |
|---|---|
| Cambiar textos, teléfono, dirección u horario | `data/site.js` |
| Añadir o quitar un servicio | `data/site.js` → `services.items` (y su icono en `public/imagenes/servicios/`) |
| Cambiar una foto del equipo | `public/imagenes/equipo/` y la ruta en `data/site.js` → `team.members` |
| Cambiar colores o tipografías | variables al principio de `app/globals.css` |
| Quitar una sección | borra su línea en `app/page.js` (y, si no se usa, su archivo en `components/sections/`) |

## Formulario de contacto → CRM

`components/sections/Contact.jsx` envía por `POST` a `${NEXT_PUBLIC_CRM_URL}/api/contacto` estos campos:
`name`, `email`, `phone`, `petType`, `petName`, `message` y `privacy`. Nombre, email, teléfono, tipo y nombre de la
mascota y mensaje son obligatorios. El tipo de mascota es texto libre (perro, gato, suricato…). También hay un campo trampa
oculto (`website`) contra el spam.

En el CRM el mensaje aparece como una oportunidad **Nueva** de origen **Web**, con la persona y su animal ya creados.
