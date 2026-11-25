# Web Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A CRM section "Web" where employees build one-page websites from 3 templates or from scratch, edit them block by block with up to 5 live collaborators, and export them as a static zip.

**Architecture:** Sites live in Supabase (`web`, `web_bloque`, `web_colaborador`, bucket `webs`) protected by RLS through `rol_en_web()`. Each block type is one module (fields + defaults + React component); the same component renders the editor preview and, through `renderToStaticMarkup`, the exported HTML. Live collaboration uses one Supabase Realtime channel per site: Presence for avatars and per-block locks, Broadcast for typing, `postgres_changes` for structural changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Supabase JS 2 (Realtime, Storage), fflate (zip), Vitest (new, dev only).

**Spec:** `docs/superpowers/specs/2026-11-24-web-builder-design.md`

## Global Constraints

- Code, comments, commit messages in English; UI text in Spanish; no emoji anywhere.
- Reuse CRM components: `Campo`, `Modal`, `Pasos`, `Casilla`, `Avatar`, `SubirArchivo`, `Vacio`, `Pestanas`, `Menu`, `useAviso`, `useConsulta`, `useSesion`, `Icono`. Editor chrome uses only CRM tokens; the site preview uses the site's own palette.
- CRM rules: 44 px targets, label above every field, errors next to the field saying how to fix it, a single primary button per screen (black in light, white in dark), confirmations name the item and the consequence ("Eliminar bloque «Servicios»"), no horizontal scroll at any width, dates dd/mm/aaaa.
- Limits: at most 3 editors counting the owner, at most 6 people counting owner, editors and readers. Admins (`es_admin()`) see and edit every site and never count, unless they are the owner.
- Only owner or admin invite, change roles, remove, delete the site; only admin changes owner. Everyone with access, readers included, can export.
- Latency: broadcast while typing every ~300 ms; save to DB debounced ~1 s and on deselect; locks released on deselect, presence leave, 2 min idle.
- Images: JPG, PNG, WEBP, max 5 MB, private bucket `webs`, path `<id_web>/<uuid>.<ext>`.
- SQL in `crm/supabase/webs.sql`, idempotent, never deletes data, run after `schema.sql`.
- Work on a feature branch (worktree). Merging into `main` and pushing only when the user asks; `git fetch` before any push, never force push.
- `.env*` files are never read, printed or committed.

## Review Focus

- Two people select the same block in the same instant: exactly one gets it (earliest `desde`), the other sees "Lo está editando <name>" and their panel stays closed. Test in Task 8.
- Tab closed or connection lost while a debounced save is pending: the last edit is saved (flush on deselect, `visibilitychange` hidden and `pagehide`); after reconnect the editor reloads from the DB. Test in Task 8.
- A collaborator is removed, or demoted to reader, while their editor is open: they lose editing at once (panel read-only, or redirected to /web with an aviso if removed). Test in Task 8.
- Export with empty fields, quotes, `<`, `&` and accents in texts, and a site name like `Café "La Plaza"/2026`: blocks with no content are skipped, text is escaped, the zip file name is a safe slug (`cafe-la-plaza-2026.zip`). Test in Task 3.
- An image referenced by a block is missing from the bucket at export time: the export still finishes, the image is left out and an aviso names the block. Test in Task 3.

---

### Task 1: Test runner, ordering, contrast and palettes

**Files:**
- Modify: `crm/package.json` (devDependencies `vitest`, script `"test": "vitest run"`)
- Create: `crm/vitest.config.ts` (alias `@` -> `crm/`, environment `node`)
- Create: `crm/lib/web/orden.ts`, `crm/lib/web/contraste.ts`, `crm/lib/web/paletas.ts`
- Test: `crm/lib/web/orden.test.ts`, `crm/lib/web/contraste.test.ts`, `crm/lib/web/paletas.test.ts`

**Interfaces:**
- Produces:
  - `ordenEntre(antes: number | null, despues: number | null): number` (null = list edge; first block 1000, gap 1000 at the end).
  - `necesitaRenumerar(antes: number, despues: number): boolean` (true when gap < 1e-6).
  - `renumerar<T extends { orden: number }>(bloques: T[]): T[]` (1000, 2000, ...).
  - `contraste(a: string, b: string): number` (WCAG ratio of two `#rrggbb`), `CONTRASTE_TEXTO = 4.5`, `CONTRASTE_GRAFICO = 3`.
  - `type Paleta = { fondo; superficie; texto; texto_suave; primario; sobre_primario: string }`.
  - `PALETAS: { id: string; nombre: string; paleta: Paleta }[]` (6 entries).
  - `avisosPaleta(p: Paleta): { color: keyof Paleta; mensaje: string }[]`.
  - `paletaACss(p: Paleta): string` (a `:root { --fondo: ...; }` block).

- [ ] **Step 1: Install and configure Vitest**

Run: `npm i -D vitest` in `crm/`, add the script and config.
Expected: `npm test` runs and reports "No test files found".

- [ ] **Step 2: Write the failing tests**

```ts
test('ordenEntre', () => {
  expect(ordenEntre(null, null)).toBe(1000)
  expect(ordenEntre(1000, null)).toBe(2000)
  expect(ordenEntre(null, 1000)).toBe(500)
  expect(ordenEntre(1000, 2000)).toBe(1500)
})
test('necesitaRenumerar', () => { expect(necesitaRenumerar(1, 1 + 1e-7)).toBe(true) })
test('contraste', () => {
  expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 1)
  expect(contraste('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
})
test('every preset palette passes', () => {
  for (const { paleta } of PALETAS) expect(avisosPaleta(paleta)).toEqual([])
})
test('avisosPaleta flags low text contrast and says how to fix it', () => {
  const p = { ...PALETAS[0].paleta, texto: '#cccccc', fondo: '#ffffff' }
  expect(avisosPaleta(p)[0]).toMatchObject({ color: 'texto' })
  expect(avisosPaleta(p)[0].mensaje).toMatch(/más oscuro|más claro/)
})
test('paletaACss', () => { expect(paletaACss(PALETAS[0].paleta)).toContain('--primario:') })
```

Pairs checked by `avisosPaleta`: texto/fondo, texto/superficie, texto_suave/fondo (4.5); sobre_primario/primario (4.5); primario/fondo (3).

- [ ] **Step 3: Run tests, expect FAIL** (`npm test`, modules not found)
- [ ] **Step 4: Implement the three modules.** Contrast uses WCAG relative luminance (sRGB linearisation, 0.03928 threshold). The 6 palettes: Claro neutro, Oscuro, Mar, Bosque, Terracota, Lavanda; all pass `avisosPaleta`.
- [ ] **Step 5: Run tests, expect PASS**
- [ ] **Step 6: Commit** `feat(web): add ordering, contrast and palette helpers with vitest`

---

### Task 2: Block types and templates

**Files:**
- Create: `crm/lib/web/tipos.ts`, `crm/lib/web/plantillas.ts`
- Create: `crm/components/web/bloques/{cabecera,texto,servicios,galeria,equipo,testimonios,preguntas,llamada,contacto}.tsx`, `crm/components/web/bloques/index.ts`
- Create: `crm/components/web/Sitio.tsx` (top bar + blocks + footer, used by preview and export)
- Test: `crm/components/web/bloques/bloques.test.tsx`

**Interfaces:**
- Consumes: `Paleta` (Task 1).
- Produces (in `tipos.ts`):
  - `type TipoBloque = 'cabecera' | 'texto' | 'servicios' | 'galeria' | 'equipo' | 'testimonios' | 'preguntas' | 'llamada' | 'contacto'`
  - `type PlantillaId = 'negocio' | 'portfolio' | 'evento' | 'vacia'`
  - `type RolWeb = 'dueno' | 'editor' | 'lector' | 'admin'`
  - `interface Bloque { id_bloque: string; id_web_fk: string; tipo: TipoBloque; orden: number; contenido: Record<string, unknown> }`
  - `interface Ajustes { titulo: string; logo: string | null; pie: string; descripcion: string }`
  - `interface Web { id_web: string; nombre: string; plantilla: PlantillaId; paleta: Paleta; ajustes: Ajustes; id_dueno_fk: string; creada: string; actualizada: string }`
  - `type CampoBloque = { clave: string; etiqueta: string; tipo: 'texto' | 'textoLargo' | 'imagen' | 'enlace' | 'lista'; campos?: CampoBloque[]; max?: number; obligatorio?: boolean }` (`lista` = repeatable items, e.g. service cards, with `campos` per item).
  - `type ResolverImagen = (ruta: string) => string` (editor: signed URL; export: `imagenes/<file>`).
  - `interface DefBloque { tipo: TipoBloque; nombre: string; descripcion: string; campos: CampoBloque[]; porDefecto: Record<string, unknown>; vacio(c: Record<string, unknown>): boolean; Componente: (p: { contenido: Record<string, unknown>; imagen: ResolverImagen; id: string }) => JSX.Element }`
- Produces: `BLOQUES: Record<TipoBloque, DefBloque>`; `<Sitio web bloques imagen />`; `PLANTILLAS: Record<PlantillaId, { nombre: string; descripcion: string; paleta: string /* PALETAS id */; fuente: string; bloques: { tipo: TipoBloque; contenido: Record<string, unknown> }[] }>` with the block lists from the spec (`vacia` has none).

- [ ] **Step 1: Write the failing tests**

```tsx
const img: ResolverImagen = (r) => `imagenes/${r.split('/').pop()}`
test.each(Object.values(BLOQUES))('$tipo renders its defaults accessibly', (def) => {
  const html = renderToStaticMarkup(<def.Componente contenido={def.porDefecto} imagen={img} id="b1" />)
  expect(html).toMatch(/^<section[^>]*id="b1"/)
  expect(html).not.toContain('<script')
  expect(html).not.toMatch(/<h1/)            // only the top bar holds the h1
  for (const tag of html.match(/<img[^>]*>/g) ?? []) expect(tag).toMatch(/alt="/)
})
test('text is escaped', () => {
  const html = renderToStaticMarkup(<BLOQUES.texto.Componente contenido={{ titulo: '<b>&"', texto: 'x' }} imagen={img} id="b" />)
  expect(html).toContain('&lt;b&gt;&amp;&quot;')
})
test('preguntas uses details/summary', () => {
  expect(renderToStaticMarkup(<BLOQUES.preguntas.Componente contenido={BLOQUES.preguntas.porDefecto} imagen={img} id="b" />)).toContain('<details')
})
test('templates only use known block types and vacia is empty', () => {
  for (const p of Object.values(PLANTILLAS)) for (const b of p.bloques) expect(BLOQUES[b.tipo]).toBeDefined()
  expect(PLANTILLAS.vacia.bloques).toEqual([])
})
```

Vitest needs `environment: 'node'` only; JSX via the default esbuild transform (`jsx: 'automatic'` in the config).

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement** the block modules (semantic HTML, class names prefixed `b-` styled by the CSS of Task 3, colours only through `var(--...)`), `Sitio.tsx` (`<header>` with `<h1>` site title and an anchor menu built from block titles, `<main>`, `<footer>`), `index.ts`, and `plantillas.ts` with Spanish sample content.
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat(web): add block types, site renderer and templates`

---

### Task 3: Static export to zip

**Files:**
- Modify: `crm/package.json` (dependency `fflate`)
- Create: `crm/lib/web/sitio.css.ts` (base CSS for blocks, responsive, `prefers-reduced-motion`, focus styles), `crm/lib/web/exportar.ts`
- Test: `crm/lib/web/exportar.test.tsx`

**Interfaces:**
- Consumes: `Sitio`, `BLOQUES`, `paletaACss`, `PLANTILLAS[...].fuente`.
- Produces:
  - `nombreArchivo(nombre: string): string` (slug, ASCII, lowercase, hyphens; empty -> `"web"`).
  - `rutasImagenes(web: Web, bloques: Bloque[]): string[]` (every storage path used, logo included).
  - `generarSitio(web: Web, bloques: Bloque[], imagenes: Record<string, Uint8Array>): Record<string, Uint8Array>` (`index.html`, `estilos.css`, `imagenes/<file>`; skips blocks where `def.vacio(contenido)`; an image path missing from `imagenes` is omitted from the markup).
  - `exportarWeb(web: Web, bloques: Bloque[], descargar: (ruta: string) => Promise<Uint8Array | null>): Promise<{ faltan: string[] }>` (downloads images, zips with `zipSync`, triggers the download of `<nombreArchivo>.zip`; returns block names whose image could not be fetched).

- [ ] **Step 1: Write the failing tests**

```ts
test('nombreArchivo', () => {
  expect(nombreArchivo('Café "La Plaza"/2026')).toBe('cafe-la-plaza-2026')
  expect(nombreArchivo('  ')).toBe('web')
})
test('generarSitio produces a standalone accessible page', () => {
  const f = generarSitio(webDePrueba, bloquesDePrueba, { 'w1/a.jpg': new Uint8Array([1]) })
  const html = new TextDecoder().decode(f['index.html'])
  expect(Object.keys(f).sort()).toEqual(['estilos.css', 'imagenes/a.jpg', 'index.html'])
  expect(html).toMatch(/^<!doctype html>/i)
  expect(html).toContain('<html lang="es">')
  expect(html).toContain('name="viewport"')
  expect(html).toContain('href="estilos.css"')
  expect(html).not.toContain('<script')
  expect(html).not.toContain('supabase')
})
test('empty blocks are skipped and missing images left out', () => {
  const f = generarSitio(webDePrueba, [bloqueVacio, bloqueConImagenQueFalta], {})
  const html = new TextDecoder().decode(f['index.html'])
  expect(html).not.toContain(bloqueVacio.id_bloque)
  expect(html).not.toMatch(/<img/)
})
```

`webDePrueba` / `bloquesDePrueba` are fixtures in the test file built from `PLANTILLAS.negocio`.

- [ ] **Step 2: Run, expect FAIL**
- [ ] **Step 3: Implement** with `renderToStaticMarkup(<Sitio ... imagen={(r) => 'imagenes/' + basename(r)} />)`, `paletaACss` + base CSS + template font stack (system stacks only, works offline), `zipSync` from fflate, download via `URL.createObjectURL`.
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit** `feat(web): export a site as a static zip`

---

### Task 4: Database (`webs.sql`) and its rollback test

**Files:**
- Create: `crm/supabase/webs.sql`
- Create: `crm/supabase/webs_prueba.sql` (whole script in `BEGIN; ... ROLLBACK;`, raises an exception on the first failed check)
- Create: `crm/lib/web/limites.ts`, Test: `crm/lib/web/limites.test.ts`

**Interfaces:**
- Produces (SQL):
  - Tables `web`, `web_bloque`, `web_colaborador` exactly as in the spec (`web` has `nombre`, `plantilla`, `paleta jsonb`, `ajustes jsonb`, `id_dueno_fk`, `creada`, `actualizada`; `web_bloque` has `actualizado`, `actualizado_por`; `updated` columns maintained by the existing `set_updated_at` pattern).
  - `rol_en_web(p_web uuid) returns text`: `dueno` if owner, else `admin` if `es_admin()`, else the `web_colaborador.rol`, else null. `SECURITY DEFINER`, `search_path = public`.
  - Trigger `comprobar_colaborador` on `web_colaborador` insert/update: rejects the owner, admins, inactive employees, a 3rd editor (`'Ya hay 3 editores contando al dueño'`), a 6th row (`'Máximo 6 personas en una web'`).
  - RPC `cambiar_dueno(p_web uuid, p_empleado uuid)`: admin only, new owner active, deletes their collaborator row, sets `id_dueno_fk`.
  - RLS policies and Storage policies for bucket `webs` as in the spec; `web` and `web_bloque` added to `supabase_realtime` (guarded so re-running does not fail).
- Produces (TS, mirrors the trigger for the UI): `limites(colaboradores: { rol: 'editor' | 'lector' }[]): { editores: number; personas: number; puedeEditor: boolean; puedeAnadir: boolean }` (counts include the owner: editores = 1 + editors, personas = 1 + rows); `MAX_EDITORES = 3`, `MAX_PERSONAS = 6`.

- [ ] **Step 1: Write `limites.test.ts`** (`[]` -> editores 1, personas 1, both true; 2 editors -> `puedeEditor` false; 2 editors + 3 readers -> `puedeAnadir` false). Run, expect FAIL, implement, expect PASS.
- [ ] **Step 2: Write `webs_prueba.sql`.** Using `set local role authenticated` and `set local request.jwt.claims` with the emails of `datos_ejemplo.sql` employees (one admin, three non-admins), check: owner creates a site; a non-member cannot select it; 2 editors accepted, 3rd rejected; 6th person rejected; admin cannot be added; reader cannot update a block; editor can; non-owner non-admin cannot insert into `web_colaborador`; admin sees and updates the site; `cambiar_dueno` by non-admin fails and by admin succeeds. Ends with `ROLLBACK`.
- [ ] **Step 3: Write `webs.sql`** until the test passes.
- [ ] **Step 4: Ask the user to run `webs_prueba.sql` in the Supabase SQL Editor** (expected: finishes with no exception, nothing persisted), then `webs.sql` (expected: success; running it a second time also succeeds).
- [ ] **Step 5: Commit** `feat(web): add web builder tables, RLS and storage`

---

### Task 5: Data access

**Files:**
- Create: `crm/lib/web/datos.ts`

**Interfaces:**
- Consumes: `createClient`, types from Task 2, `ordenEntre`/`renumerar`, `PLANTILLAS`, `PALETAS`.
- Produces (all throw the Supabase error; callers show it with `useAviso`):
  - `listarWebs(): Promise<(Web & { rol: RolWeb; dueno: string })[]>` (RLS already limits rows; `dueno` = owner's full name).
  - `crearWeb(nombre: string, plantilla: PlantillaId, paleta: Paleta): Promise<string>` (inserts the site and the template blocks with `ordenEntre`; returns `id_web`).
  - `cargarWeb(id: string): Promise<{ web: Web; bloques: Bloque[]; rol: RolWeb }>` (rol via `rpc('rol_en_web')`).
  - `actualizarWeb(id: string, cambios: Partial<Pick<Web, 'nombre' | 'paleta' | 'ajustes'>>): Promise<void>`
  - `guardarContenido(idBloque: string, contenido: Record<string, unknown>): Promise<void>`
  - `anadirBloque(idWeb: string, tipo: TipoBloque, antes: number | null, despues: number | null): Promise<Bloque>`
  - `moverBloque(bloques: Bloque[], idBloque: string, direccion: -1 | 1): Promise<Bloque[]>` (renumbers in one upsert when `necesitaRenumerar`).
  - `borrarBloque(idBloque: string): Promise<void>`, `borrarWeb(id: string): Promise<void>` (also removes `webs/<id>/*`).
  - `subirImagen(idWeb: string, archivo: File): Promise<string>` (returns storage path), `urlImagen(ruta: string): Promise<string>` (signed URL, 1 h, cached in a Map), `descargarImagen(ruta: string): Promise<Uint8Array | null>`.
  - `listarColaboradores(idWeb: string)`, `guardarColaborador(idWeb, idEmpleado, rol)`, `quitarColaborador(idWeb, idEmpleado)`, `cambiarDueno(idWeb, idEmpleado)`.

- [ ] **Step 1: Implement** following the style of `lib/agente.ts` and `lib/archivos.ts`.
- [ ] **Step 2: Type-check** `npx tsc --noEmit` in `crm/`, expect no errors.
- [ ] **Step 3: Commit** `feat(web): add data access for sites, blocks and collaborators`

(Exercised end to end in Tasks 6 to 9; the SQL behaviour is covered by Task 4.)

---

### Task 6: Navigation, "Mis webs" and "Nueva web"

**Files:**
- Modify: `crm/components/layout/navegacion.ts` (group `Web`, link `{ href: '/web', texto: 'Mis webs', icono: 'web' }`)
- Modify: `crm/components/ui/Icono.tsx` (add `web`, a globe/browser icon)
- Create: `crm/app/web/page.tsx`, `crm/app/web/nueva/page.tsx`, `crm/components/web/TarjetaWeb.tsx`, `crm/components/web/SelectorPaleta.tsx`

**Interfaces:**
- Consumes: `listarWebs`, `crearWeb`, `PLANTILLAS`, `PALETAS`, `avisosPaleta`, `Pestanas`, `Pasos`, `Vacio`.
- Produces: `<SelectorPaleta valor onCambiar />` (6 swatches with mini preview + "Personalizar" with 6 colour inputs and `avisosPaleta` messages next to each), reused by "Ajustes de la web" in Task 7.

- [ ] **Step 1: "Mis webs"**: tabs Mías / Ajenas / Todas with counters (Mías = `id_dueno_fk` is me; Ajenas = the rest RLS returns, which for an admin is every other site and for anyone else the sites shared with them); grid of `TarjetaWeb` (name, template, "Borrador", last change dd/mm/aaaa, role; owner's name bottom-right when not mine); search box when more than 10; empty state per tab with "Nueva web"; "Nueva web" is the primary button.
- [ ] **Step 2: "Nueva web"**: `Pasos` with "Plantilla" (4 cards: 3 templates + "Empezar desde cero") and "Colores" (`SelectorPaleta`, preselected with the template's palette) plus the "Nombre de la web" field (required, error next to it); "Crear web" calls `crearWeb` and goes to `/web/<id>`.
- [ ] **Step 3: Verify** `npx tsc --noEmit` and `npm run lint` clean; `npm test` still passes.
- [ ] **Step 4: Commit** `feat(web): add site list and new site wizard`

---

### Task 7: Editor (single user)

**Files:**
- Create: `crm/app/web/[id]/page.tsx`, `crm/components/web/editor/{Editor,BarraEditor,Vista,MarcoBloque,PanelBloque,PanelAjustes,CatalogoBloques,CampoBloqueControl}.tsx`

**Interfaces:**
- Consumes: Task 2 to 5 exports, `SelectorPaleta`.
- Produces: `Editor` props `{ web: Web; bloques: Bloque[]; rol: RolWeb }` and internal state `seleccion: string | 'ajustes' | null`, plus the hook points Task 8 plugs into: `onSeleccionar(id | 'ajustes' | null)`, `onCambioContenido(id, contenido)`, `bloqueadoPor(id): string | null` (returns null in this task).

- [ ] **Step 1: Layout**: full width like the Pipeline; top bar (editable name, "Guardado"/"Guardando…" status, slot for avatars, "Ver colaboradores" slot, "Exportar" primary); centre `Vista` renders `Sitio` inside a container with the palette as CSS variables and a desktop/mobile width toggle; right panel 360 px, sheet over the preview below `lg`.
- [ ] **Step 2: Blocks**: `MarcoBloque` wraps each block (focusable, outline on hover/focus, actions up/down/delete with accessible names; delete confirms "Eliminar bloque «<name>»"); "+ Añadir bloque" between blocks and at the end opens `CatalogoBloques` (Modal, list of `BLOQUES` with name and description).
- [ ] **Step 3: Panels**: `PanelBloque` builds the form from `def.campos` with `Campo` (lists with add/remove/reorder items, images through `SubirArchivo accept="image/jpeg,image/png,image/webp" maxMB={5}` + `subirImagen`, alt text field required next to each image); `PanelAjustes` edits name, title, logo, description, footer and palette. Changes update the preview at once and save debounced 1 s (flush on deselect).
- [ ] **Step 4: Roles**: `lector` gets the panel read-only and no block actions or add buttons; "Exportar" works for every role (`exportarWeb` + aviso listing `faltan`).
- [ ] **Step 5: Verify** type-check, lint, tests.
- [ ] **Step 6: Commit** `feat(web): add block editor with preview, panels and export`

---

### Task 8: Live collaboration

**Files:**
- Create: `crm/lib/web/presencia.ts`, Test: `crm/lib/web/presencia.test.ts`
- Create: `crm/hooks/useColaboracion.ts`
- Modify: `crm/components/web/editor/Editor.tsx`, `BarraEditor.tsx` (avatars), `MarcoBloque.tsx` ("Editando: <name>" badge with `candado` icon, `aria-disabled`)

**Interfaces:**
- Produces (pure, tested):
  - `type Presencia = { id_empleado: string; nombre: string; rol: RolWeb; bloque: string | 'ajustes' | null; desde: number; activo: number }`
  - `duenoDelBloque(presencias: Presencia[], bloque: string, ahora: number): Presencia | null` (among those holding `bloque` and active within 2 min, the smallest `desde`).
- Produces (hook): `useColaboracion(idWeb: string, yo: { id_empleado; nombre; rol }): { presentes: Presencia[]; seleccionar(b: string | 'ajustes' | null): boolean /* false if someone else holds it */; bloqueadoPor(b): string | null; emitirContenido(id, contenido): void; onRemoto: { contenido(id, c), estructura(), rol(nuevoRol | null) } }`.

- [ ] **Step 1: Write the failing tests**

```ts
const p = (id: string, bloque: string | null, desde: number, activo = 0): Presencia =>
  ({ id_empleado: id, nombre: id, rol: 'editor', bloque, desde, activo })
test('earliest holder wins a tie', () => {
  expect(duenoDelBloque([p('ana', 'b1', 20), p('luis', 'b1', 10)], 'b1', 0)?.id_empleado).toBe('luis')
})
test('idle for 2 minutes releases the lock', () => {
  expect(duenoDelBloque([p('ana', 'b1', 0, 0)], 'b1', 120_001)).toBeNull()
})
test('free block', () => { expect(duenoDelBloque([p('ana', 'b2', 0)], 'b1', 0)).toBeNull() })
```

- [ ] **Step 2: Run, expect FAIL; implement `presencia.ts`; run, expect PASS.**
- [ ] **Step 3: Implement `useColaboracion`** on channel `web:<id>` with `config: { presence: { key: id_empleado } }`: `track` on join and on every selection/activity (activity throttled to 30 s); Broadcast event `contenido` throttled 300 ms; `postgres_changes` on `web_bloque` (filter `id_web_fk=eq.<id>`), `web` (filter `id_web=eq.<id>`) and `web_colaborador` (filter `id_web_fk=eq.<id>`) to reload structure, apply remote saves to blocks not selected by me, and react to my role changing; after `seleccionar`, wait for the next presence sync and give up the selection if `duenoDelBloque` is someone else (aviso "Lo está editando <name>"). On `CHANNEL_ERROR`/reconnect, reload via `cargarWeb`. Flush pending saves on deselect, `visibilitychange` hidden and `pagehide`.
- [ ] **Step 4: Wire into `Editor`**: avatars (initials, name in tooltip, "admin" label), locked blocks cannot be selected, moved or deleted; removal sends the user to `/web` with an aviso; demotion makes the editor read-only at once.
- [ ] **Step 5: Verify** type-check, lint, tests.
- [ ] **Step 6: Commit** `feat(web): live collaboration with presence and block locks`

---

### Task 9: "Ver colaboradores"

**Files:**
- Create: `crm/components/web/editor/Colaboradores.tsx`
- Modify: `crm/components/web/editor/BarraEditor.tsx`

**Interfaces:**
- Consumes: `listarColaboradores`, `guardarColaborador`, `quitarColaborador`, `cambiarDueno`, `limites`, `useCatalogos` (employees list).

- [ ] **Step 1: Read-only view (everyone)**: Modal "Colaboradores" listing owner (label "Dueño"), each person with "Editor"/"Lector", and counters "Editores 2/3 · Personas 4/6".
- [ ] **Step 2: Manage view (owner or admin)**: same list with a role select and "Quitar" per person (confirm "Quitar a <name> de «<site>»"); section "Añadir" with a searchable list of active non-admin employees not already in, each a `Casilla` plus an Editor/Lector choice; options disabled by `limites` with the reason visible ("Ya hay 3 editores contando al dueño", "Máximo 6 personas"); "Guardar cambios" primary. Admin also sees "Cambiar dueño" (select of active employees, confirm naming the new owner).
- [ ] **Step 3: Verify** type-check, lint, tests.
- [ ] **Step 4: Commit** `feat(web): manage collaborators from the editor`

---

### Task 10: Docs and browser check

**Files:**
- Modify: `CLAUDE.md` (structure: `crm/app/web`, `crm/supabase/webs.sql` after `schema.sql`), `crm/README.md` if it lists SQL files.

- [ ] **Step 1: Update docs** and commit `docs: describe the web builder module`.
- [ ] **Step 2: Main session checks in ONE browser** (dev server on 3001, two sessions: admin and employee): create from each template and from scratch; change palette and see a contrast warning; add, edit, reorder, delete blocks; upload an image; invite (limits and reasons visible), demote, remove; two people select the same block; type and watch the other tab update within ~0.5 s; reader cannot edit but exports; export, unzip, open `index.html` offline; widths 320 px and desktop without horizontal scroll; keyboard only through the editor.
- [ ] **Step 3: Close servers and browser tabs.**
