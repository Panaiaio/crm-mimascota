import type { EstadoGuardado } from './colaGuardado'
import type { Bloque, Web } from './tipos'

/** Selected block id, the site settings, or nothing */
export type Seleccion = string | 'ajustes' | null

export type EstadoEditor = {
  web: Web
  bloques: Bloque[]
  seleccion: Seleccion
  guardado: EstadoGuardado
  /** A write was rejected: the editor is read-only from now on */
  sinPermiso: boolean
  /** A block move is being written: further moves wait so none is lost */
  moviendo: boolean
}

export type AccionEditor =
  | { tipo: 'web'; web: Web }
  | { tipo: 'bloques'; bloques: Bloque[] }
  | { tipo: 'contenido'; id: string; contenido: Record<string, unknown> }
  | { tipo: 'seleccion'; seleccion: Seleccion }
  | { tipo: 'guardado'; guardado: EstadoGuardado }
  | { tipo: 'sinPermiso' }
  | { tipo: 'moviendo'; moviendo: boolean }

const ordenar = (bloques: Bloque[]) => [...bloques].sort((a, b) => a.orden - b.orden)

export function estadoInicial(web: Web, bloques: Bloque[]): EstadoEditor {
  return { web, bloques: ordenar(bloques), seleccion: null, guardado: 'guardado', sinPermiso: false, moviendo: false }
}

export function reducirEditor(e: EstadoEditor, a: AccionEditor): EstadoEditor {
  switch (a.tipo) {
    case 'web':
      return { ...e, web: a.web }
    case 'bloques': {
      const bloques = ordenar(a.bloques)
      // A selected block that no longer exists (deleted here or by someone else) is deselected
      const sigue = e.seleccion === null || e.seleccion === 'ajustes' || bloques.some((b) => b.id_bloque === e.seleccion)
      return { ...e, bloques, seleccion: sigue ? e.seleccion : null }
    }
    case 'contenido':
      return { ...e, bloques: e.bloques.map((b) => (b.id_bloque === a.id ? { ...b, contenido: a.contenido } : b)) }
    case 'seleccion':
      return { ...e, seleccion: a.seleccion }
    case 'guardado':
      return { ...e, guardado: a.guardado }
    case 'sinPermiso':
      return { ...e, sinPermiso: true }
    case 'moviendo':
      return { ...e, moviendo: a.moviendo }
  }
}
