import { createClient } from '@/lib/supabase/client'
import { BLOQUES } from '@/components/web/bloques'
import { PLANTILLAS } from './plantillas'
import type { Paleta } from './paletas'
import { necesitaRenumerar, ordenEntre, renumerar } from './orden'
import type { Ajustes, Bloque, PlantillaId, RolWeb, TipoBloque, Web } from './tipos'

// ============================================================
// Browser-side data access for the web builder (sites, blocks,
// images and collaborators). RLS limits what each user sees.
// Every function throws the Supabase error; callers show it.
//  webs → private bucket, files at <id_web>/<uuid>.<ext>
// ============================================================

const BUCKET = 'webs'
const COLUMNAS_BLOQUE = 'id_bloque, id_web_fk, tipo, orden, contenido'
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGEN = 5 * 1024 * 1024
const URL_SEGUNDOS = 3600
/** A cached signed URL is renewed when less than this is left */
export const RENOVAR_MS = 5 * 60_000

/** Time limit for every query */
const limite = () => AbortSignal.timeout(15_000)

export const SIN_PERMISO = 'Ya no tienes permiso para editar esta web'
export const SIN_ACCESO = 'No tienes acceso a esta web'

export type WebConRol = Web & { rol: RolWeb; dueno: string }

export async function listarWebs(yo: { id_empleado: string; esAdmin: boolean }): Promise<WebConRol[]> {
  const sb = createClient()
  const [webs, colab] = await Promise.all([
    sb
      .from('web')
      .select('*, dueno:empleado!web_id_dueno_fk_fkey(nombre, apellidos)')
      .order('actualizada', { ascending: false })
      .abortSignal(limite()),
    sb.from('web_colaborador').select('id_web_fk, rol').eq('id_empleado_fk', yo.id_empleado).abortSignal(limite()),
  ])
  if (webs.error) throw webs.error
  if (colab.error) throw colab.error
  const roles = new Map((colab.data ?? []).map((c) => [c.id_web_fk as string, c.rol as 'editor' | 'lector']))
  return (webs.data ?? []).map((fila) => {
    const { dueno, ...web } = fila as unknown as Web & { dueno: { nombre: string; apellidos: string | null } | null }
    const rol: RolWeb =
      web.id_dueno_fk === yo.id_empleado ? 'dueno' : (roles.get(web.id_web) ?? (yo.esAdmin ? 'admin' : 'lector'))
    return { ...web, rol, dueno: dueno ? `${dueno.nombre} ${dueno.apellidos ?? ''}`.trim() : '' }
  })
}

export async function crearWeb(nombre: string, plantilla: PlantillaId, paleta: Paleta): Promise<string> {
  const sb = createClient()
  const ajustes: Ajustes = { titulo: nombre, logo: null, pie: '', descripcion: '' }
  const { data, error } = await sb
    .from('web')
    .insert({ nombre, plantilla, paleta, ajustes })
    .select('id_web')
    .abortSignal(limite())
    .single()
  if (error) throw error
  const id = data.id_web as string
  const filas = renumerar(PLANTILLAS[plantilla].bloques.map((b) => ({ ...b, orden: 0 }))).map((b) => ({
    id_web_fk: id,
    tipo: b.tipo,
    orden: b.orden,
    contenido: b.contenido,
  }))
  if (filas.length) {
    const { error: errBloques } = await sb.from('web_bloque').insert(filas).abortSignal(limite())
    if (errBloques) {
      await sb.from('web').delete().eq('id_web', id).abortSignal(limite())
      throw errBloques
    }
  }
  return id
}

export async function cargarWeb(id: string): Promise<{ web: Web; bloques: Bloque[]; rol: RolWeb }> {
  const sb = createClient()
  const [web, bloques, rol] = await Promise.all([
    sb.from('web').select('*').eq('id_web', id).abortSignal(limite()).single(),
    sb.from('web_bloque').select(COLUMNAS_BLOQUE).eq('id_web_fk', id).order('orden').abortSignal(limite()),
    rolEnWeb(id),
  ])
  // The role goes first: without access the site row is simply not found
  if (!rol) throw new Error(SIN_ACCESO)
  if (web.error) throw web.error
  if (bloques.error) throw bloques.error
  return { web: web.data as Web, bloques: bloques.data as Bloque[], rol }
}

/** My role in the site, or null without access */
export async function rolEnWeb(id: string): Promise<RolWeb | null> {
  const { data, error } = await createClient().rpc('rol_en_web', { p_web: id }).abortSignal(limite())
  if (error) throw error
  return (data as RolWeb | null) ?? null
}

export async function actualizarWeb(id: string, cambios: Partial<Pick<Web, 'nombre' | 'paleta' | 'ajustes'>>) {
  const { data, error } = await createClient().from('web').update(cambios).eq('id_web', id).select('id_web').abortSignal(limite())
  if (error) throw error
  if (!data?.length) throw new Error(SIN_PERMISO)
}

export async function guardarContenido(idBloque: string, contenido: Record<string, unknown>) {
  const { data, error } = await createClient()
    .from('web_bloque')
    .update({ contenido })
    .eq('id_bloque', idBloque)
    .select('id_bloque')
    .abortSignal(limite())
  if (error) throw error
  if (!data?.length) throw new Error(SIN_PERMISO)
}

/** Adds a block with its default content between two neighbours (null = list edge) */
export async function anadirBloque(idWeb: string, tipo: TipoBloque, antes: number | null, despues: number | null): Promise<Bloque> {
  const { data, error } = await createClient()
    .from('web_bloque')
    .insert({ id_web_fk: idWeb, tipo, orden: ordenEntre(antes, despues), contenido: BLOQUES[tipo].porDefecto })
    .select(COLUMNAS_BLOQUE)
    .abortSignal(limite())
    .single()
  if (error) throw error
  return data as Bloque
}

/** Moves a block one place up (-1) or down (1) and returns the new sorted list */
export async function moverBloque(bloques: Bloque[], idBloque: string, direccion: -1 | 1): Promise<Bloque[]> {
  const sb = createClient()
  const i = bloques.findIndex((b) => b.id_bloque === idBloque)
  const j = i + direccion
  if (i < 0 || j < 0 || j >= bloques.length) return bloques

  const lista = [...bloques]
  ;[lista[i], lista[j]] = [lista[j], lista[i]]
  // Neighbours of the moved block (now at index j) in the new order
  const antes = lista[j - 1]?.orden ?? null
  const despues = lista[j + 1]?.orden ?? null

  if (antes !== null && despues !== null && necesitaRenumerar(antes, despues)) {
    const renumerados = renumerar(lista)
    // Only orden is written, so a stale contenido can never overwrite a newer edit
    const resultados = await Promise.all(
      renumerados.map((b) =>
        sb.from('web_bloque').update({ orden: b.orden }).eq('id_bloque', b.id_bloque).select('id_bloque').abortSignal(limite()),
      ),
    )
    for (const r of resultados) {
      if (r.error) throw r.error
      if (!r.data?.length) throw new Error(SIN_PERMISO)
    }
    return renumerados
  }

  // Only the moved block changes; its neighbours keep their position
  const orden = ordenEntre(antes, despues)
  const { data, error } = await sb.from('web_bloque').update({ orden }).eq('id_bloque', idBloque).select('id_bloque').abortSignal(limite())
  if (error) throw error
  if (!data?.length) throw new Error(SIN_PERMISO)
  lista[j] = { ...lista[j], orden }
  return lista
}

/** Whether the block is still there (a failed write may mean someone else deleted it) */
export async function existeBloque(idBloque: string): Promise<boolean> {
  const { data, error } = await createClient()
    .from('web_bloque')
    .select('id_bloque')
    .eq('id_bloque', idBloque)
    .abortSignal(limite())
    .maybeSingle()
  if (error) throw error
  return data !== null
}

export async function borrarBloque(idBloque: string) {
  const { data, error } = await createClient()
    .from('web_bloque')
    .delete()
    .eq('id_bloque', idBloque)
    .select('id_bloque')
    .abortSignal(limite())
  if (error) throw error
  if (!data?.length) throw new Error(SIN_PERMISO)
}

/** Deletes the site, its blocks (cascade) and every file under webs/<id>/ (owner or admin only) */
export async function borrarWeb(id: string) {
  const sb = createClient()
  const rol = await rolEnWeb(id)
  if (rol !== 'dueno' && rol !== 'admin') throw new Error('Solo el dueño o un administrador puede borrar la web')

  // Files first: once the row is gone, the storage policies no longer allow removing them.
  // Each removed page shifts the listing, so the offset stays at 0.
  for (;;) {
    const { data: archivos, error: errLista } = await sb.storage.from(BUCKET).list(id, { limit: 100 })
    if (errLista) throw errLista
    if (!archivos?.length) break
    const { data: borrados, error } = await sb.storage.from(BUCKET).remove(archivos.map((a) => `${id}/${a.name}`))
    if (error) throw error
    if (!borrados?.length) throw new Error('No se han podido borrar las imágenes de la web')
  }
  const { data, error } = await sb.from('web').delete().eq('id_web', id).select('id_web').abortSignal(limite())
  if (error) throw error
  if (!data?.length) throw new Error('No se ha podido borrar la web')
}

// ---------- Images ----------

/** Uploads an image to webs/<idWeb>/ and returns its storage path */
export async function subirImagen(idWeb: string, archivo: File): Promise<string> {
  if (!TIPOS_IMAGEN.includes(archivo.type)) throw new Error('La imagen debe ser JPG, PNG o WebP.')
  if (archivo.size > MAX_IMAGEN) throw new Error('La imagen pesa más de 5 MB. Elige una más pequeña.')
  const ext = archivo.type === 'image/jpeg' ? 'jpg' : archivo.type.split('/')[1]
  const ruta = `${idWeb}/${crypto.randomUUID()}.${ext}`
  const { error } = await createClient().storage.from(BUCKET).upload(ruta, archivo, { upsert: false, contentType: archivo.type })
  if (error) throw error
  return ruta
}

const urls = new Map<string, { url: string; caduca: number }>()

/** Signed URL valid for 1 hour, cached and refreshed when under 5 minutes are left */
export async function urlImagen(ruta: string): Promise<string> {
  const guardada = urls.get(ruta)
  if (guardada && guardada.caduca - Date.now() > RENOVAR_MS) return guardada.url
  const { data, error } = await createClient().storage.from(BUCKET).createSignedUrl(ruta, URL_SEGUNDOS)
  if (error) throw error
  urls.set(ruta, { url: data.signedUrl, caduca: Date.now() + URL_SEGUNDOS * 1000 })
  return data.signedUrl
}

/** File bytes for the export; null on any error (the exporter treats it as missing) */
export async function descargarImagen(ruta: string): Promise<Uint8Array | null> {
  try {
    const { data, error } = await createClient().storage.from(BUCKET).download(ruta)
    if (error || !data) return null
    return new Uint8Array(await data.arrayBuffer())
  } catch {
    return null
  }
}

// ---------- Collaborators ----------

export async function listarColaboradores(idWeb: string): Promise<{ id_empleado: string; nombre: string; rol: 'editor' | 'lector' }[]> {
  const { data, error } = await createClient()
    .from('web_colaborador')
    .select('id_empleado_fk, rol, empleado:empleado(nombre, apellidos)')
    .eq('id_web_fk', idWeb)
    .abortSignal(limite())
  if (error) throw error
  return (data ?? [])
    .map((c) => {
      const e = c.empleado as unknown as { nombre: string; apellidos: string | null } | null
      return {
        id_empleado: c.id_empleado_fk as string,
        nombre: e ? `${e.nombre} ${e.apellidos ?? ''}`.trim() : '',
        rol: c.rol as 'editor' | 'lector',
      }
    })
    .sort((a, b) => (a.rol === b.rol ? a.nombre.localeCompare(b.nombre, 'es') : a.rol === 'editor' ? -1 : 1))
}

export async function guardarColaborador(idWeb: string, idEmpleado: string, rol: 'editor' | 'lector') {
  const { error } = await createClient()
    .from('web_colaborador')
    .upsert({ id_web_fk: idWeb, id_empleado_fk: idEmpleado, rol }, { onConflict: 'id_web_fk,id_empleado_fk' })
    .abortSignal(limite())
  if (error) throw error
}

export async function quitarColaborador(idWeb: string, idEmpleado: string) {
  const { error } = await createClient()
    .from('web_colaborador')
    .delete()
    .eq('id_web_fk', idWeb)
    .eq('id_empleado_fk', idEmpleado)
    .abortSignal(limite())
  if (error) throw error
}

export async function cambiarDueno(idWeb: string, idEmpleado: string) {
  const { error } = await createClient().rpc('cambiar_dueno', { p_web: idWeb, p_empleado: idEmpleado }).abortSignal(limite())
  if (error) throw error
}
