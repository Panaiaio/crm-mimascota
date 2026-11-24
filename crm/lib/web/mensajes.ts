import { MAX_NOMBRE } from './limites'
import type { Paleta } from './paletas'
import type { Ajustes, Web } from './tipos'

// Broadcast messages come from other browsers: nothing in them is trusted.
// Each reader keeps only well-formed fields and drops the rest.

/** Largest block content accepted from a broadcast (characters of JSON) */
export const MAX_CONTENIDO = 100_000

const CLAVES_PALETA: (keyof Paleta)[] = ['fondo', 'superficie', 'texto', 'texto_suave', 'primario', 'sobre_primario']
const COLOR = /^#[0-9a-fA-F]{6}$/

type Remitente = { id_empleado: string; tab: string }
export type MensajeContenido = Remitente & { id_bloque: string; contenido: Record<string, unknown> }
export type MensajeAjustes = Remitente & { cambios: Partial<Pick<Web, 'nombre' | 'paleta' | 'ajustes'>> }

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype

const texto = (v: unknown): v is string => typeof v === 'string' && v.length > 0

function remitente(x: Record<string, unknown>): Remitente | null {
  return texto(x.id_empleado) && texto(x.tab) ? { id_empleado: x.id_empleado, tab: x.tab } : null
}

function cabe(v: unknown): boolean {
  try {
    return JSON.stringify(v).length <= MAX_CONTENIDO
  } catch {
    return false
  }
}

/** `{ id_empleado, tab, id_bloque, contenido }` with a plain-object content under the size cap, or null */
export function leerContenido(x: unknown): MensajeContenido | null {
  if (!esObjeto(x)) return null
  const de = remitente(x)
  if (!de || !texto(x.id_bloque) || !esObjeto(x.contenido) || !cabe(x.contenido)) return null
  return { ...de, id_bloque: x.id_bloque, contenido: x.contenido }
}

function leerPaleta(v: unknown): Paleta | null {
  if (!esObjeto(v) || !CLAVES_PALETA.every((k) => typeof v[k] === 'string' && COLOR.test(v[k]))) return null
  return Object.fromEntries(CLAVES_PALETA.map((k) => [k, v[k]])) as Paleta
}

function leerAjustesWeb(v: unknown): Ajustes | null {
  if (!esObjeto(v) || !cabe(v)) return null
  const { titulo, pie, descripcion, logo } = v
  if (typeof titulo !== 'string' || typeof pie !== 'string' || typeof descripcion !== 'string') return null
  if (logo !== null && typeof logo !== 'string') return null
  return { titulo, pie, descripcion, logo }
}

/** Sender plus only the valid ones of `nombre`, `paleta` and `ajustes`; null without a valid sender */
export function leerAjustes(x: unknown): MensajeAjustes | null {
  if (!esObjeto(x)) return null
  const de = remitente(x)
  if (!de) return null
  const cambios: MensajeAjustes['cambios'] = {}
  if (typeof x.nombre === 'string' && x.nombre.length <= MAX_NOMBRE) cambios.nombre = x.nombre
  const paleta = leerPaleta(x.paleta)
  if (paleta) cambios.paleta = paleta
  const ajustes = leerAjustesWeb(x.ajustes)
  if (ajustes) cambios.ajustes = ajustes
  return { ...de, cambios }
}
