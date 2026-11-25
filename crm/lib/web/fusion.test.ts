import { expect, test } from 'vitest'
import { aplicarBloque, bloqueActualizado, conservar, fusionarBloques, fusionarWeb, iguales } from './fusion'
import { claveItem } from './listas'
import { PALETAS } from './paletas'
import type { Bloque, Web } from './tipos'

const bloque = (id: string, orden: number, contenido: Record<string, unknown> = { titulo: id }): Bloque =>
  ({ id_bloque: id, id_web_fk: 'w1', tipo: 'texto', orden, contenido })

const web: Web = {
  id_web: 'w1',
  nombre: 'Web',
  plantilla: 'vacia',
  paleta: PALETAS[0].paleta,
  ajustes: { titulo: 'T', logo: null, pie: '', descripcion: '' },
  id_dueno_fk: 'u1',
  creada: '',
  actualizada: '2026-01-01',
}

test('iguales ignores key order (jsonb reorders keys)', () => {
  expect(iguales({ a: 1, b: [{ x: 1, y: 2 }] }, { b: [{ y: 2, x: 1 }], a: 1 })).toBe(true)
  expect(iguales({ a: 1 }, { a: 1, b: undefined })).toBe(false)
  expect(iguales([1, 2], [2, 1])).toBe(false)
  expect(iguales(null, {})).toBe(false)
})

test('conservar keeps unchanged parts and list items (with their keys)', () => {
  const a = { x: 1 }
  const b = { x: 2 }
  const antes = { titulo: 'T', items: [a, b] }
  const claveB = claveItem(b)
  expect(conservar(antes, { items: [{ x: 1 }, { x: 2 }], titulo: 'T' })).toBe(antes)

  // An item added in front: the old items are found by value
  const delante = conservar(antes, { titulo: 'T', items: [{ x: 0 }, { x: 1 }, { x: 2 }] })
  expect(delante.items[1]).toBe(a)
  expect(delante.items[2]).toBe(b)

  // An item edited in place keeps its key
  const editado = conservar(antes, { titulo: 'T', items: [{ x: 1 }, { x: 3 }] })
  expect(editado.items[0]).toBe(a)
  expect(editado.items[1]).toEqual({ x: 3 })
  expect(claveItem(editado.items[1])).toBe(claveB)
})

test('aplicarBloque keeps the same list when nothing changed', () => {
  const locales = [bloque('a', 1), bloque('b', 2)]
  expect(aplicarBloque(locales, bloque('a', 1), null)).toBe(locales)
})

test('aplicarBloque updates one block and keeps the other objects', () => {
  const locales = [bloque('a', 1), bloque('b', 2)]
  const nuevos = aplicarBloque(locales, bloque('a', 3, { titulo: 'nuevo' }), null)
  expect(nuevos[0]).toEqual(bloque('a', 3, { titulo: 'nuevo' }))
  expect(nuevos[1]).toBe(locales[1])
})

test('aplicarBloque never touches the content of the block I hold, but takes its order', () => {
  const locales = [bloque('a', 1, { titulo: 'mío' })]
  const nuevos = aplicarBloque(locales, bloque('a', 5, { titulo: 'viejo' }), 'a')
  expect(nuevos[0].contenido).toBe(locales[0].contenido)
  expect(nuevos[0].orden).toBe(5)
})

test('aplicarBloque adds an unknown block only for an INSERT, and keeps local content when the row has none', () => {
  const locales = [bloque('a', 1)]
  expect(aplicarBloque(locales, bloque('b', 2), null, true).map((b) => b.id_bloque)).toEqual(['a', 'b'])
  expect(aplicarBloque(locales, bloque('b', 2), null)).toBe(locales)
  const sinContenido = { ...bloque('a', 4), contenido: undefined } as unknown as Bloque
  expect(aplicarBloque(locales, sinContenido, null)[0].contenido).toBe(locales[0].contenido)
})

test('fusionarBloques follows the database list, keeping untouched objects', () => {
  const locales = [bloque('a', 1), bloque('b', 2, { titulo: 'mío' }), bloque('c', 3)]
  const remotos = [bloque('a', 1), bloque('b', 2, { titulo: 'viejo' }), bloque('d', 4)]
  const r = fusionarBloques(locales, remotos, 'b')
  expect(r.map((b) => b.id_bloque)).toEqual(['a', 'b', 'd'])
  expect(r[0]).toBe(locales[0])
  expect(r[1]).toBe(locales[1])
})

test('fusionarWeb ignores rows whose name, palette and settings are unchanged', () => {
  expect(fusionarWeb(web, { ...web, actualizada: '2026-02-02' }, false)).toBe(web)
})

test('fusionarWeb applies remote settings unless I hold them', () => {
  const remota = { ...web, nombre: 'Otra', ajustes: { ...web.ajustes, pie: 'Pie' } }
  const r = fusionarWeb(web, remota, false)
  expect(r.nombre).toBe('Otra')
  expect(r.ajustes.pie).toBe('Pie')
  expect(r.paleta).toBe(web.paleta)
  expect(fusionarWeb(web, remota, true)).toBe(web)
})

test('fusionarWeb takes a new owner even while I hold the settings', () => {
  expect(fusionarWeb(web, { ...web, nombre: 'Otra', id_dueno_fk: 'u2' }, true)).toEqual({ ...web, id_dueno_fk: 'u2' })
})

test('bloqueActualizado drops the content of my own echo but keeps its order', () => {
  const fila = { ...bloque('a', 7, { titulo: 'viejo' }), actualizado: 'x', actualizado_por: 'yo' }
  const mio = bloqueActualizado(fila, 'yo')
  expect(mio.contenido).toBeUndefined()
  expect(Object.keys(mio).sort()).toEqual(['contenido', 'id_bloque', 'id_web_fk', 'orden', 'tipo'])
  const locales = [bloque('a', 1, { titulo: 'nuevo' })]
  const r = aplicarBloque(locales, mio, null)
  expect(r[0].orden).toBe(7)
  expect(r[0].contenido).toBe(locales[0].contenido)
  expect(bloqueActualizado(fila, 'otro').contenido).toEqual({ titulo: 'viejo' })
})
