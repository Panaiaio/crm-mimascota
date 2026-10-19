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
│   ├── layout.js             ← fuentes (Fraunces e Inter), metadatos SEO y datos estructurados (JSON-LD)
│   ├── page.js               ← la página: Navbar + secciones + Footer
│   ├── globals.css           ← variables de diseño (colores, tipografía, espacios, radios) y estilos base
│   └── icon.svg              ← icono de la pestaña
├── components/
│   ├── layout/               ← Navbar y Footer
│   ├── sections/             ← una sección por archivo (Hero, Services, About, Specialties, Team, Testimonials, Contact)
│   └── ui/                   ← piezas reutilizables: Button, Container, Logo, SectionHeading, Reveal, Counter,
│                               Field (campo de formulario), Icon (iconos de lucide) y TeamCard
├── data/
│   └── site.js               ← TODOS los textos, datos de contacto, horario y rutas de las imágenes
├── lib/
│   └── motion.js             ← animaciones de Framer Motion (cortas y discretas)
└── public/imagenes/
    ├── logo.png
    ├── portada/              ← foto de la portada y de "Sobre nosotros"
    ├── equipo/               ← fotos del equipo
    └── servicios/, especialidades/ ← iconos PNG antiguos, ya no se usan (se pueden borrar)
```

**Cómo se conecta:** `app/page.js` monta las secciones en orden. Cada sección lee su contenido de `data/site.js`
y lo pinta con las piezas de `components/ui`. Para cambiar un texto, un teléfono o una foto se cambia en
`data/site.js` (las imágenes se guardan en `public/imagenes/…` y en `site.js` se pone su ruta).

## Sistema de diseño

- **Colores**: verde salvia, verde oscuro, terracota, crema y beige, más tonos derivados para texto pequeño
  (`--color-primary-ink`, `--color-accent-ink`) que cumplen contraste AA.
- **Tipografía**: Fraunces (titulares, peso 400, tracking negativo) e Inter (texto). Escala en `--display-*` y `--text-*`.
- **Radios**: solo dos, `--radius-sm` (botones y campos) y `--radius-lg` (imágenes y paneles).
- **Separación**: bordes de 1px en lugar de sombras; ritmo vertical común con `--section-space`.
- **Iconos**: solo lucide-react (trazo fino). Los servicios eligen su icono por nombre en `site.js`
  (ver la lista en `components/ui/Icon.jsx`).
- **Movimiento**: aparición corta (0,5 s, 12 px) una sola vez; se desactiva con "reducir movimiento" del sistema.

## Cambios habituales

| Quiero… | Dónde |
|---|---|
| Cambiar textos, teléfono, dirección u horario | `data/site.js` |
| Añadir o quitar un servicio | `data/site.js` → `services.items` (icono de `components/ui/Icon.jsx`) |
| Cambiar una foto del equipo | `public/imagenes/equipo/` y la ruta en `data/site.js` → `team.members` |
| Cambiar colores o tipografías | variables al principio de `app/globals.css` |
| Quitar una sección | borra su línea en `app/page.js` (y, si no se usa, su archivo en `components/sections/`) |

## Formulario de contacto → CRM

`components/sections/Contact.jsx` envía por `POST` a `${NEXT_PUBLIC_CRM_URL}/api/contacto` estos campos:
`name`, `email`, `phone`, `petType`, `petName`, `message` y `privacy`. Nombre, email, teléfono, tipo y nombre de la
mascota y mensaje son obligatorios. El tipo de mascota es texto libre (perro, gato, suricato…). También hay un campo trampa
oculto (`website`) contra el spam.

En el CRM el mensaje aparece como una oportunidad **Nueva** de origen **Web**, con la persona y su animal ya creados.
