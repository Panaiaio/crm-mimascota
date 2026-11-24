import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { crearLimitador } from './limitar'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test('runs the first call at once and only the latest one at the end of the window', () => {
  const lim = crearLimitador(300)
  const hechos: number[] = []
  lim.ejecutar('a', () => hechos.push(1))
  lim.ejecutar('a', () => hechos.push(2))
  lim.ejecutar('a', () => hechos.push(3))
  expect(hechos).toEqual([1])
  vi.advanceTimersByTime(300)
  expect(hechos).toEqual([1, 3])
  vi.advanceTimersByTime(300)
  expect(hechos).toEqual([1, 3])
  lim.ejecutar('a', () => hechos.push(4))
  expect(hechos).toEqual([1, 3, 4])
})

test('keys are independent', () => {
  const lim = crearLimitador(300)
  const hechos: string[] = []
  lim.ejecutar('a', () => hechos.push('a'))
  lim.ejecutar('b', () => hechos.push('b'))
  expect(hechos).toEqual(['a', 'b'])
})

test('cancelar drops the pending calls', () => {
  const lim = crearLimitador(300)
  const hechos: number[] = []
  lim.ejecutar('a', () => hechos.push(1))
  lim.ejecutar('a', () => hechos.push(2))
  lim.cancelar()
  vi.advanceTimersByTime(1000)
  expect(hechos).toEqual([1])
})
