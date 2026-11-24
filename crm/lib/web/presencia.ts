import type { RolWeb } from './tipos'

/** What each person in the editor tracks in Realtime presence (channel `web:<id>`) */
export type Presencia = {
  id_empleado: string
  nombre: string
  rol: RolWeb
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
 * Who holds `bloque`: among the active people (not readers) who have it
 * selected, the one who selected it first. Null when it is free.
 */
export function duenoDelBloque(presencias: Presencia[], bloque: string, ahora: number): Presencia | null {
  let dueno: Presencia | null = null
  for (const p of presencias) {
    if (p.bloque !== bloque || p.rol === 'lector' || ahora - p.activo > INACTIVO_MS) continue
    if (!dueno || p.desde < dueno.desde) dueno = p
  }
  return dueno
}

/** Realtime presence state (one list per key, one entry per open tab) as a flat list */
export function leerPresencias(estado: Record<string, Presencia[]>): Presencia[] {
  return Object.values(estado).flat()
}

/** Everyone in the site except me, once each, sorted by name (for the avatars) */
export function personas(presencias: Presencia[], yo: string): Presencia[] {
  const unicas = new Map<string, Presencia>()
  for (const p of presencias) if (p.id_empleado !== yo && !unicas.has(p.id_empleado)) unicas.set(p.id_empleado, p)
  return [...unicas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
