import { expect, test } from 'vitest'
import { cambiarItemPorClave, claveItem, insertarItem, itemVacio, moverItem, quitarItem } from './listas'
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

test('item keys follow the item through moves and edits, and are not stored in it', () => {
  const lista = [{ n: 'a' }, { n: 'b' }]
  const claveB = claveItem(lista[1])
  const movida = moverItem(lista, 1, -1)
  expect(claveItem(movida[0])).toBe(claveB)
  // A late update aimed at "b" still finds it after the move
  const editada = cambiarItemPorClave(movida, claveB, (it) => ({ ...it, n: 'B' }))
  expect(editada.map((i) => i.n)).toEqual(['B', 'a'])
  expect(claveItem(editada[0])).toBe(claveB)
  expect(Object.keys(editada[0])).toEqual(['n'])
  // Once removed, the update does nothing
  expect(cambiarItemPorClave(quitarItem(editada, 0), claveB, () => ({ n: 'x' }))).toEqual([{ n: 'a' }])
})
