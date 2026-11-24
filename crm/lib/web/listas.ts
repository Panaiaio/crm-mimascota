import type { CampoBloque } from './tipos'

// Pure operations on the items of a `lista` block field. Every function returns a new array.

type Item = Record<string, unknown>

/** A new item with every field empty */
export function itemVacio(campos: CampoBloque[]): Item {
  return Object.fromEntries(campos.map((c) => [c.clave, c.tipo === 'lista' ? [] : '']))
}

export function insertarItem(items: Item[], i: number, item: Item): Item[] {
  const j = Math.max(0, Math.min(i, items.length))
  return [...items.slice(0, j), item, ...items.slice(j)]
}

export function quitarItem(items: Item[], i: number): Item[] {
  return items.filter((_, k) => k !== i)
}

/** Moves item `i` one place up (-1) or down (1); out of range leaves the list as it is */
export function moverItem(items: Item[], i: number, direccion: -1 | 1): Item[] {
  const j = i + direccion
  if (i < 0 || i >= items.length || j < 0 || j >= items.length) return items
  const lista = [...items]
  ;[lista[i], lista[j]] = [lista[j], lista[i]]
  return lista
}
