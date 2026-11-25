# Web builder module (CRM "Web" section) - design

Date: 2026-11-24. Status: approved by the user (2026-11-24).

## Intent

A new CRM section where employees build **new, standalone websites** that have
nothing to do with the clinic's own site (`web/`). It works like a small
WordPress: pick a template, pick a colour palette, then edit the page block by
block. The finished site is **exported as a zip** of static files that opens
with a double click or can be uploaded to any hosting. Up to five other
employees can be invited to collaborate live, Canva-style.

It is a class project (2.º DAM, ERP/CRM): it must work reliably in a demo and
follow the course UX and accessibility guides that the rest of the CRM follows.

## Goals

- Create a site from one of **3 templates** or **"Empezar desde cero"**, then choose a **palette**.
- Edit with **blocks**: add, remove, reorder sections; edit each block's fields.
- Sites are saved as **drafts** (autosave). No publishing step; the output is the export.
- Each employee has a list of their sites and of the sites shared with them ("Mis webs").
- **Export** to a zip (`index.html`, `estilos.css`, `imagenes/`) that works offline, without the CRM or Supabase.
- **Live collaboration**: see who is in, see others' changes within about half a second, per-block locks so nobody overwrites anybody.

## Non-goals

- Multi-page sites. A site is one page with sections (anchor navigation).
- Free-form drag-and-drop layout (Wix style).
- Character-level co-editing of the same text (Google Docs style, Yjs).
- Hosting or publishing sites from the CRM; working contact forms in the exported site.
- Any link with the clinic's site in `web/`.

## Anti-goals (failure even if it "works")

- Noticeable lag, or one collaborator's work overwriting another's.
- An editor that ignores the CRM design rules (tokens, 44 px targets, labels above fields, black/white primary buttons, no horizontal scroll).
- Exported sites that fail WCAG 2.2 AA (contrast, alt text, heading order, keyboard).

## Constraints

- Stack already in `crm/`: Next.js 16, React 19, TypeScript, Tailwind v4, Supabase (RLS, Storage, Realtime). Reuse the existing UI components (`Campo`, `Modal`, `Pasos`, `Casilla`, `Avatar`, `SubirArchivo`, `Vacio`, `useAviso`, `Menu`).
- SQL goes in a new idempotent file `crm/supabase/webs.sql`, run after `schema.sql`; it must not delete data. Test it inside a transaction with ROLLBACK first.
- Identity is the employee: `mi_empleado()` returns the current employee id. Any active employee can use the module (not admin-only).
- Code and docs in English, UI in Spanish, no emoji.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Own editor: live preview in the centre, side panel with the selected block's fields | Fits the CRM components and UX/accessibility rules; per-block saving makes per-block locks natural. More code than a library. |
| B | Inline editing on the page (contenteditable) | Most visual, but hard to make accessible, needs sanitising pasted HTML, and still needs a panel for images and colours. |
| C | Ready-made editor library (Puck, GrapesJS) | Editor comes built, but its own look and English UI must be rewritten for our rules, and it has no live collaboration; fitting per-block locks into its internal state is the headache we want to avoid. |

The user picked A. For collaboration the user picked "live, block by block"
over plain shared access (conflicts) and character-level sync (needs Yjs and a
server).

## Decided by the user

### Flow

1. **Mis webs** (`/web`): list of the sites I own and the ones shared with me, with my role. Button "Nueva web".
2. **Nueva web**: step 1 choose one of 3 templates or "Empezar desde cero"; step 2 choose the palette; then the editor opens.
3. **Editor** (`/web/[id]`): edit blocks, everything autosaves as a draft. "Exportar" downloads the zip.

### Collaboration and permissions

- Roles: **dueño** (owner, creator), **editor**, **lector** (reader).
- Limits: at most **3 editors counting the owner** (owner + 2) and at most **6 people in total** counting owner, editors and readers. The owner always counts as editor and as one of the 6.
- **Only the owner** invites, changes someone between editor and reader, removes people, and deletes the site.
- Editors edit blocks, palette and site name. Readers see the site and the live changes but cannot change anything.
- **Everyone, readers included, can export.**
- In the editor top-right everyone has **"Ver colaboradores"**: it lists the people and their role. For the owner the same dialog also lets them add employees (list of all employees with checkboxes and an Editor/Lector choice each), change roles and remove people. There is no separate "Invitar colaborador" button.
- When a limit is reached the relevant choices are disabled with a visible reason ("Ya hay 3 editores contando contigo", "Máximo 6 personas").

### Admins

- An **admin** (`es_admin()`) can see and edit **every** site, even when not invited.
- An admin is **always admin**. Admins are never invited as collaborators (they do not appear in the invite list) and **do not count** towards any limit (editors, readers or the total of 6).
- If an admin **creates** a site, they are its owner as well as admin, and as owner they **do count** (owner = one of the 3 editors and one of the 6).
- Admins can **delete** any site and **change its owner** ("Cambiar dueño", inside "Ver colaboradores"). This covers sites whose owner has been deactivated.

### Live behaviour

- Your own typing shows instantly. Others see block changes within about half a second; the database is saved about once a second.
- Avatars (initials) of who is in the site, top-right.
- While someone edits a block, it shows "Editando: <name>" for everybody else and they cannot select, move or delete it until it is released.

## Builder's design (my calls, open to correction)

### Data model (`crm/supabase/webs.sql`)

- `web`: `id_web uuid pk`, `nombre`, `plantilla` (`negocio | portfolio | evento | vacia`), `paleta jsonb` (named colours, see Palettes), `id_dueno_fk -> empleado`, `creada`, `actualizada`.
- `web_bloque`: `id_bloque uuid pk`, `id_web_fk -> web on delete cascade`, `tipo`, `orden double precision` (insert between neighbours by midpoint; renumber when gaps get too small), `contenido jsonb`, `actualizado`, `actualizado_por -> empleado`.
- `web_colaborador`: `(id_web_fk, id_empleado_fk)` pk, `rol` (`editor | lector`). The owner is not a row here; ownership is `web.id_dueno_fk`.
- Limits enforced in the database by a trigger on `web_colaborador` (not only in the UI): editors <= 2 and rows <= 5 per site; the owner cannot be added as collaborator.
- Helper `rol_en_web(p_web uuid) returns text` (`dueno | editor | lector | admin | null`), `SECURITY DEFINER`, based on `mi_empleado()` and `es_admin()`. Owner wins (`dueno`, the policies give owners every admin-level power anyway); any other admin gets `admin`. The limits trigger rejects admins as collaborators, so they are never rows in `web_colaborador`.
- RLS ("manage" = owner or admin):
  - `web`: select if `rol_en_web` is not null; insert with `id_dueno_fk = mi_empleado()`; update by owner, editor or admin; delete by manage.
  - `web_bloque`: select for any role; insert/update/delete by owner, editor or admin.
  - `web_colaborador`: select for anyone with a role on that site; insert/update/delete by manage.
- Change owner (`cambiar_dueno(p_web, p_empleado)` RPC, admin only, my call): the new owner must be an active employee; if they were a collaborator their row is removed; the previous owner is simply removed (the admin can add them back as collaborator).
- Storage: private bucket `webs`, path `<id_web>/<uuid>.<ext>`, policies by `rol_en_web` on the first folder (read for members, write for owner/editor). Images limited to JPG, PNG, WEBP, max 5 MB. The editor shows them with signed URLs.
- Realtime: add `web_bloque` and `web` to the `supabase_realtime` publication.

### Live sync (Supabase Realtime, one channel per site `web:<id>`)

- **Presence**: each client tracks `{ id_empleado, nombre, rol, bloque: id | null, desde }`. This gives the avatars and the locks. A block is locked by whoever has it in presence; if two people select the same block at the same instant, the earliest `desde` wins and the other is told "Lo está editando <name>".
- **Broadcast** while typing (throttled ~300 ms): the block's new `contenido`, so others see it at once without database writes.
- **Database** (debounced ~1 s, and on deselect): update the row. Structural changes (add, delete, reorder, palette, name) go straight to the database and reach others via `postgres_changes`, which respects RLS.
- "Ajustes de la web" (name, palette, top bar, footer) is locked as one unit, exactly like a block: presence `bloque` takes the reserved value `ajustes`. Top bar and footer content live in a `web.ajustes jsonb` column, so the `web` table has `nombre`, `paleta` and `ajustes`.
- Locks are released on deselect, when the tab closes (presence leave) and after 2 minutes idle. Locks are enforced in the client; the database only enforces roles. Acceptable for this project.
- On reconnect the editor reloads the site from the database.

### Templates and blocks

- One-page sites. Fixed parts every site has: **top bar** (site name or logo, anchor menu built from the blocks) and **footer**; both editable from "Ajustes de la web".
- Block types (each with a fields schema, a React component for the preview and the same component for export): `cabecera` (hero), `texto`, `servicios` (cards), `galeria`, `equipo`, `testimonios`, `preguntas` (`<details>`), `llamada` (call to action), `contacto` (address, phone, email, hours, map link; no form).
- Templates are a default palette, a font stack and a starting list of blocks with sample content in Spanish:
  - `negocio` (local business): cabecera, servicios, texto, testimonios, contacto.
  - `portfolio`: cabecera, galeria, texto, llamada.
  - `evento`: cabecera, texto (programme), equipo (speakers), preguntas, contacto.
  - `vacia` ("Empezar desde cero"): only top bar and footer, with an empty state and "+ Añadir bloque".
- Each block type is one TypeScript module (fields + defaults + component), so adding a type does not touch the editor.

### Palettes

- Step 2 shows 6 preset palettes as swatches with a mini preview; each sets `fondo`, `superficie`, `texto`, `texto_suave`, `primario`, `sobre_primario`.
- "Personalizar" lets you pick each colour. The editor checks contrast (4.5:1 text, 3:1 for buttons and borders) and warns next to the colour how to fix it; it does not block saving.
- The palette can be changed later from "Ajustes de la web".
- Palettes are free colours (only the contrast rule applies): the exported sites are not the clinic's brand. The CRM tokens apply to the editor interface around the preview, not to the site being built.

### Verification

- Vitest (new dev dependency) for the pure logic: block ordering by midpoint, contrast check, palette to CSS, and the exported HTML of each block.
- `webs.sql` tested inside a transaction with ROLLBACK, including the collaborator limits trigger and the RLS for each role.
- Manual check in the browser with two sessions (owner and collaborator) for presence, locks and live changes.

### Editor screen

- Full width like the Pipeline view. Top bar: site name (editable), "Guardado" status, avatars, "Ver colaboradores", "Exportar" (the single primary button).
- Centre: the live preview with the site's own palette; hover/focus shows each block's outline and its actions (up, down, delete, with confirmation naming the block). "+ Añadir bloque" between blocks opens the block catalogue.
- Right: panel with the selected block's fields (`Campo` with label above, errors next to the field), or "Ajustes de la web" when nothing is selected. On narrow screens the panel becomes a sheet over the preview.
- Preview width toggle: desktop / mobile.
- Readers get the same screen with the panel read-only and no block actions.
- Fully usable by keyboard: blocks are focusable, actions have accessible names, locks are announced.

### Export

- In the browser: render each block with `renderToStaticMarkup`, wrap it in an HTML document (`lang="es"`, title, meta description, viewport), generate `estilos.css` from the palette and template, download the images from the bucket into `imagenes/`, zip with **fflate** and download `<nombre-de-la-web>.zip`.
- The exported site uses no JavaScript, is responsive, works offline (system font stacks), respects `prefers-reduced-motion`, and keeps alt texts and heading order.

### Navigation

- New sidebar group **Web** with one link **Mis webs** (`/web`).
- "Mis webs" has three tabs: **Mías**, **Ajenas**, **Todas** (user's decision). For an admin, Ajenas is every site they do not own; for any other employee it is the sites shared with them (my call: same tabs for everyone). Every card of a site that is not mine shows the **owner's name at the bottom right**, in Ajenas and in Todas.
- In the editor an admin shows in the avatars with the "admin" label and can also add, change and remove collaborators (my call, so orphan sites stay manageable).

## Left to the builder

- Exact fields per block type, sample texts, the 6 palettes and font stacks (within the tokens/contrast rules).
- Component and file names under `crm/app/web/` and `crm/components/web/`.
- Throttle/debounce values within the stated latency.
- Image resizing before upload, if needed to keep zips small.
