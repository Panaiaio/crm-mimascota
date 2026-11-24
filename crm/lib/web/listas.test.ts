import { expect, test } from 'vitest'
import { insertarItem, itemVacio, moverItem, quitarItem } from './listas'
import { BLOQUES } from '@/components/web/bloques'

const items = [{ n: 'a' }, { n: 'b' }, { n: 'c' }]

test('itemVacio has every field empty', () => {
  const campos = BLOQUES.equipo.campos.find((c) => c.tipo === 'lista')!.campos!
  expect(itemVacio(campos)).toEqual({ nombre: '', cargo: '', foto: '', alt: '' })
})

test('insertarItem puts the item back at its place, clamped to the list', () => {
  expect(insertarItem(items, 1, { n: 'x' }).map((i) => i.n)).toEqual(['a', 'x', 'b', 'c'])
  expect(insertarItem(items, 9, { n: 'x' }).map((i) => i.n)).toEqual(['a', 'b', 'c', 'x'])
})

test('quitarItem removes one item without touching the original', () => {
  expect(quitarItem(items, 0).map((i) => i.n)).toEqual(['b', 'c'])
  expect(items).toHaveLength(3)
})

test('moverItem swaps with the neighbour and ignores the edges', () => {
  expect(moverItem(items, 0, 1).map((i) => i.n)).toEqual(['b', 'a', 'c'])
  expect(moverItem(items, 2, -1).map((i) => i.n)).toEqual(['a', 'c', 'b'])
  expect(moverItem(items, 0, -1)).toBe(items)
  expect(moverItem(items, 2, 1)).toBe(items)
})
