import { limites } from './limites'

export type RolColaborador = 'editor' | 'lector'
type Persona = { id_empleado: string; rol: RolColaborador }

export const MOTIVO_EDITORES = 'Ya hay 3 editores contando al dueño'
export const MOTIVO_PERSONAS = 'Máximo 6 personas'

/**
 * Everyone else in the site once the pending role changes and additions are applied,
 * leaving `id` out: the limits for `id` are checked against this list.
 */
export function otrosDe(
  actuales: Persona[],
  cambios: Record<string, RolColaborador>,
  anadir: Record<string, RolColaborador>,
  id: string,
): { rol: RolColaborador }[] {
  const existentes = actuales.map((c) => ({ id: c.id_empleado, rol: cambios[c.id_empleado] ?? c.rol }))
  const nuevos = Object.entries(anadir).map(([i, rol]) => ({ id: i, rol }))
  return [...existentes, ...nuevos].filter((p) => p.id !== id)
}

/** Why `rol` cannot be given to someone (`nuevo` = not in the site yet), or null when it can */
export function motivoBloqueo(otros: { rol: RolColaborador }[], rol: RolColaborador, nuevo: boolean): string | null {
  const l = limites(otros)
  if (nuevo && !l.puedeAnadir) return MOTIVO_PERSONAS
  if (rol === 'editor' && !l.puedeEditor) return MOTIVO_EDITORES
  return null
}

/** Name to show for someone in the site; flags deactivated employees and missing records */
export function nombrePersona(p: { nombre: string; apellidos: string | null; activo: boolean } | undefined): string {
  if (!p) return '(empleado sin datos)'
  const nombre = [p.nombre, p.apellidos].filter(Boolean).join(' ')
  return p.activo ? nombre : `${nombre} (inactivo)`
}
