import { heredarClave } from './listas'
import type { Bloque, Web } from './tipos'

// Applying changes made by other people without replacing what did not change:
// untouched blocks and list items keep their object, so React keeps their
// state and list items keep their key (listas.claveItem).

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Deep equality of JSON values; key order does not matter (jsonb reorders keys) */
export function iguales(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => iguales(x, b[i]))
  }
  if (!esObjeto(a) || !esObjeto(b)) return false
  const claves = Object.keys(a)
  return claves.length === Object.keys(b).length && claves.every((k) => k in b && iguales(a[k], b[k]))
}

/** `nuevo`, reusing every part of `anterior` that is equal to it */
export function conservar<T>(anterior: T, nuevo: T): T {
  if (iguales(anterior, nuevo)) return anterior
  if (Array.isArray(anterior) && Array.isArray(nuevo)) {
    const usados = new Set<number>()
    // First the items found by value anywhere (moved or untouched)...
    const resultado: unknown[] = nuevo.map((n) => {
      const j = anterior.findIndex((a, k) => !usados.has(k) && iguales(a, n))
      if (j < 0) return undefined
      usados.add(j)
      return anterior[j]
    })
    // ...then an item edited in place is merged with the old one at its position and keeps its key
    return nuevo.map((n, i) => {
      if (resultado[i] !== undefined) return resultado[i]
      const a = anterior[i]
      if (usados.has(i) || !esObjeto(a) || !esObjeto(n)) return n
      usados.add(i)
      return heredarClave(a, conservar(a, n))
    }) as T
  }
  if (esObjeto(anterior) && esObjeto(nuevo)) {
    return Object.fromEntries(Object.entries(nuevo).map(([k, v]) => [k, conservar(anterior[k], v)])) as T
  }
  return nuevo
}

/**
 * One block row from elsewhere applied to the local list. The content of the
 * block I hold (`retenido`) is never replaced; a row without content (not sent
 * by Realtime) keeps the local one. Returns the same list when nothing changed.
 */
export function aplicarBloque(locales: Bloque[], remoto: Bloque, retenido: string | null): Bloque[] {
  const i = locales.findIndex((b) => b.id_bloque === remoto.id_bloque)
  if (i < 0) return [...locales, remoto]
  const local = locales[i]
  const contenido = remoto.id_bloque === retenido || remoto.contenido === undefined ? local.contenido : conservar(local.contenido, remoto.contenido)
  if (contenido === local.contenido && local.orden === remoto.orden && local.tipo === remoto.tipo) return locales
  return locales.map((b, k) => (k === i ? { ...local, tipo: remoto.tipo, orden: remoto.orden, contenido } : b))
}

/** The database list (e.g. after a reconnect) applied to the local one: blocks not in it are gone */
export function fusionarBloques(locales: Bloque[], remotos: Bloque[], retenido: string | null): Bloque[] {
  return remotos.map((r) => {
    const local = locales.find((b) => b.id_bloque === r.id_bloque)
    return local ? aplicarBloque([local], r, retenido)[0] : r
  })
}

/**
 * Site row (or settings broadcast) from elsewhere. Name, palette and settings are
 * taken unless I hold the settings; the owner is always taken. Returns the same
 * object when nothing that matters changed (e.g. only `actualizada`).
 */
export function fusionarWeb(local: Web, remota: Partial<Web>, retengoAjustes: boolean): Web {
  const nombre = retengoAjustes ? local.nombre : (remota.nombre ?? local.nombre)
  const paleta = retengoAjustes || !remota.paleta ? local.paleta : conservar(local.paleta, remota.paleta)
  const ajustes = retengoAjustes || !remota.ajustes ? local.ajustes : conservar(local.ajustes, remota.ajustes)
  const id_dueno_fk = remota.id_dueno_fk ?? local.id_dueno_fk
  if (nombre === local.nombre && paleta === local.paleta && ajustes === local.ajustes && id_dueno_fk === local.id_dueno_fk) return local
  return { ...local, nombre, paleta, ajustes, id_dueno_fk }
}
