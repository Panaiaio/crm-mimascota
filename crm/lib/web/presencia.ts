import type { RolWeb } from './tipos'

/** What each open editor tab tracks in Realtime presence (channel `web:<id>`) */
export type Presencia = {
  id_empleado: string
  nombre: string
  rol: RolWeb
  /** An admin of the CRM (shown as such even when they own the site) */
  esAdmin: boolean
  /** Random id of the browser tab: the same employee may have the site open twice */
  tab: string
  /** Block id, the site settings ('ajustes') or nothing */
  bloque: string | 'ajustes' | null
  /** When `bloque` was selected (ms) */
  desde: number
  /** Last edit (ms) */
  activo: number
}

/** Someone idle for longer than this no longer holds a lock */
export const INACTIVO_MS = 2 * 60_000

/**
 * Who holds `bloque`: among the active tabs (not readers) that have it selected,
 * the one that selected it first; an exact tie goes to the smaller tab id, so
 * every client picks the same one. Null when it is free.
 */
export function duenoDelBloque(presencias: Presencia[], bloque: string, ahora: number): Presencia | null {
  let dueno: Presencia | null = null
  for (const p of presencias) {
    if (p.bloque !== bloque || p.rol === 'lector' || ahora - p.activo > INACTIVO_MS) continue
    if (!dueno || p.desde < dueno.desde || (p.desde === dueno.desde && p.tab < dueno.tab)) dueno = p
  }
  return dueno
}

/** Whether the tab `tab` is the one holding `bloque` (only the holder's typing is applied) */
export function esDelDueno(presencias: Presencia[], bloque: string, tab: string, ahora: number): boolean {
  return duenoDelBloque(presencias, bloque, ahora)?.tab === tab
}

const ROLES: readonly RolWeb[] = ['dueno', 'editor', 'lector', 'admin']
const MAX_NOMBRE_PRESENCIA = 120

/** One presence entry sent by another client, or null when it is not a valid Presencia */
function comoPresencia(x: unknown): Presencia | null {
  if (typeof x !== 'object' || x === null) return null
  const e = x as Record<string, unknown>
  const { id_empleado, nombre, rol, esAdmin, tab, bloque, desde, activo } = e
  if (typeof id_empleado !== 'string' || typeof tab !== 'string') return null
  if (typeof nombre !== 'string' || nombre.length > MAX_NOMBRE_PRESENCIA) return null
  if (typeof rol !== 'string' || !ROLES.includes(rol as RolWeb)) return null
  if (typeof esAdmin !== 'boolean') return null
  if (bloque !== null && typeof bloque !== 'string') return null
  if (typeof desde !== 'number' || !Number.isFinite(desde) || typeof activo !== 'number' || !Number.isFinite(activo)) return null
  // Only the known fields are kept (Realtime adds presence_ref)
  return { id_empleado, nombre, rol: rol as RolWeb, esAdmin, tab, bloque, desde, activo }
}

/**
 * Realtime presence state (one list per key, one entry per open tab) as a flat list.
 * Entries come from other clients, so anything malformed is left out.
 */
export function leerPresencias(estado: Record<string, unknown[]>): Presencia[] {
  return Object.values(estado)
    .flat()
    .map(comoPresencia)
    .filter((x): x is Presencia => x !== null)
}

/** Everyone in the site once each: me first, then the others by name (for the avatars) */
export function personas(presencias: Presencia[], yo: string): Presencia[] {
  const unicas = new Map<string, Presencia>()
  for (const p of presencias) if (!unicas.has(p.id_empleado)) unicas.set(p.id_empleado, p)
  return [...unicas.values()].sort((a, b) =>
    a.id_empleado === yo ? -1 : b.id_empleado === yo ? 1 : a.nombre.localeCompare(b.nombre, 'es'),
  )
}
