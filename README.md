# Clínica Veterinaria · Web + CRM

Proyecto de Sistemas de Gestión Empresarial. Contiene dos aplicaciones Next.js:

| Carpeta | Qué es | Dirección en local |
|---|---|---|
| `web/` | Web pública de la clínica (Next.js + Framer Motion) | http://localhost:3000 |
| `crm/` | CRM (oportunidades, empresas, particulares y animales) y Recursos Humanos (Next.js + Supabase) | http://localhost:3001 |

Cuando alguien rellena el formulario de contacto de la web, el mensaje se envía a
`crm/` (`POST /api/contacto`) y aparece en el CRM como una oportunidad **Nueva**, con la persona y su animal ya creados.

```
Web (3000)  ──formulario──►  CRM /api/contacto (3001)  ──►  Supabase (tabla oportunidad)
```

## Puesta en marcha

Necesitas **Node.js 20.9 o superior**.

### 1. Base de datos (solo la primera vez)
1. Crea un proyecto en [supabase.com](https://supabase.com) (o usa el que ya tienes).
2. **SQL Editor → New query**: pega `crm/supabase/schema.sql` y pulsa **Run**.
   Crea todas las tablas, los permisos y las carpetas de archivos (fotos, CV y nóminas).
   > Ojo: si ya había tablas de una versión anterior del CRM, las borra.
3. (Recomendado) Ejecuta también `crm/supabase/datos_ejemplo.sql` para tener datos de prueba.
4. **Authentication → Users → Add user** (marca *Auto Confirm User*):
   - `prueba@gmail.com` → entra como **administradora** (Laura).
   - `recepcion@mimascota.es` → entra como **empleada** (Elena), para ver lo que ve alguien sin permisos.

### 2. Variables de entorno
- `crm/.env.local`: copia `crm/.env.example` y pon la URL y la clave `anon` de Supabase
  (**Project Settings → API**).
- `web/.env.local`: copia `web/.env.example`. En local no hace falta cambiar nada.

### 3. Instalar y arrancar
Desde la carpeta raíz del proyecto:

```bash
npm install     # instala la raíz, web/ y crm/
npm run dev     # arranca la web y el CRM a la vez
```

- Web: http://localhost:3000
- CRM: http://localhost:3001 (entra con el usuario creado en Supabase)

También se pueden arrancar por separado con `npm run dev:web` o `npm run dev:crm`.

## Probar la conexión
1. Abre la web, baja hasta **Contacto** y envía el formulario.
2. Entra en el CRM: el mensaje aparece en **Inicio** («Para contestar») y en **Oportunidades** con estado *Nuevo*
   y origen *Web*. La persona aparece en **Particulares** con su animal (si ya existía, se reutiliza).

## Qué campos viajan de la web al CRM

| Formulario web | Columna de `oportunidad` |
|---|---|
| Nombre | `nombre_contacto` → se busca o se crea el **particular** |
| Email | `correo_contacto` |
| Teléfono | `telefono_contacto` |
| Tipo de mascota (perro, gato o lo que escriba) | `especie_animal` |
| Nombre de la mascota | `nombre_animal` → se busca o se crea el **animal** y se asocia a la persona |
| Mensaje | `mensaje` |
| Política de privacidad | `consentimiento` |

El resto (estado, valor, probabilidad, responsable, cita…) lo gestiona el equipo desde el CRM.
Más detalles de cada parte en `web/README.md` y `crm/README.md`.
