import { expect, test } from 'vitest'
import { estadoInicial, reducirEditor } from './estadoEditor'
import { PALETAS } from './paletas'
import type { Bloque, Web } from './tipos'

const web: Web = {
  id_web: 'w1',
  nombre: 'Web',
  plantilla: 'vacia',
  paleta: PALETAS[0].paleta,
  ajustes: { titulo: '', logo: null, pie: '', descripcion: '' },
  id_dueno_fk: 'u1',
  creada: '',
  actualizada: '',
}
const bloque = (id: string, orden: number): Bloque => ({ id_bloque: id, id_web_fk: 'w1', tipo: 'texto', orden, contenido: { titulo: id } })

test('blocks are kept sorted by orden', () => {
  const e = estadoInicial(web, [bloque('b', 2), bloque('a', 1)])
  expect(e.bloques.map((b) => b.id_bloque)).toEqual(['a', 'b'])
  const e2 = reducirEditor(e, { tipo: 'bloques', bloques: [...e.bloques, bloque('c', 0)] })
  expect(e2.bloques.map((b) => b.id_bloque)).toEqual(['c', 'a', 'b'])
})

test('replacing blocks deselects a block that is gone but keeps the settings selected', () => {
  let e = reducirEditor(estadoInicial(web, [bloque('a', 1)]), { tipo: 'seleccion', seleccion: 'a' })
  e = reducirEditor(e, { tipo: 'bloques', bloques: [bloque('b', 1)] })
  expect(e.seleccion).toBeNull()
  e = reducirEditor(e, { tipo: 'seleccion', seleccion: 'ajustes' })
  expect(reducirEditor(e, { tipo: 'bloques', bloques: [] }).seleccion).toBe('ajustes')
})

test('contenido replaces only that block', () => {
  const e = reducirEditor(estadoInicial(web, [bloque('a', 1), bloque('b', 2)]), { tipo: 'contenido', id: 'b', contenido: { titulo: 'x' } })
  expect(e.bloques.map((b) => b.contenido.titulo)).toEqual(['a', 'x'])
})
