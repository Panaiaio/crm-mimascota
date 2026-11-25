import { test, expect } from 'vitest'
import { ordenEntre, necesitaRenumerar, renumerar } from './orden'

test('ordenEntre', () => {
  expect(ordenEntre(null, null)).toBe(1000)
  expect(ordenEntre(1000, null)).toBe(2000)
  expect(ordenEntre(null, 1000)).toBe(500)
  expect(ordenEntre(1000, 2000)).toBe(1500)
})

test('necesitaRenumerar', () => {
  expect(necesitaRenumerar(1, 1 + 1e-7)).toBe(true)
  expect(necesitaRenumerar(1000, 2000)).toBe(false)
})

test('renumerar', () => {
  const r = renumerar([{ id: 'a', orden: 1 }, { id: 'b', orden: 1.0000001 }])
  expect(r).toEqual([{ id: 'a', orden: 1000 }, { id: 'b', orden: 2000 }])
})
