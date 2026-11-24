import { expect, test } from 'vitest'
import { duenoDelBloque, esDelDueno, leerPresencias, personas, type Presencia } from './presencia'

const p = (id: string, bloque: string | null, desde: number, activo = 0): Presencia =>
  ({ id_empleado: id, nombre: id, rol: 'editor', esAdmin: false, tab: `tab-${id}`, bloque, desde, activo })

test('earliest holder wins a tie', () => {
  expect(duenoDelBloque([p('ana', 'b1', 20), p('luis', 'b1', 10)], 'b1', 0)?.id_empleado).toBe('luis')
})

test('idle for 2 minutes releases the lock', () => {
  expect(duenoDelBloque([p('ana', 'b1', 0, 0)], 'b1', 120_001)).toBeNull()
  expect(duenoDelBloque([p('ana', 'b1', 0, 0)], 'b1', 120_000)?.id_empleado).toBe('ana')
})

test('free block', () => {
  expect(duenoDelBloque([p('ana', 'b2', 0)], 'b1', 0)).toBeNull()
})

test('an idle earlier holder gives way to an active later one', () => {
  expect(duenoDelBloque([p('ana', 'b1', 0, 0), p('luis', 'b1', 100_000, 100_000)], 'b1', 150_000)?.id_empleado).toBe('luis')
})

test('readers never hold a lock', () => {
  expect(duenoDelBloque([{ ...p('ana', 'ajustes', 0), rol: 'lector' }], 'ajustes', 0)).toBeNull()
})

test('the same desde goes to the smaller tab id, whatever the order', () => {
  const a = { ...p('ana', 'b1', 5), tab: 'b' }
  const b = { ...p('ana', 'b1', 5), tab: 'a' }
  expect(duenoDelBloque([a, b], 'b1', 0)?.tab).toBe('a')
  expect(duenoDelBloque([b, a], 'b1', 0)?.tab).toBe('a')
})

test('esDelDueno is true only for the holding tab', () => {
  const lista = [p('ana', 'b1', 1), p('luis', 'b1', 2)]
  expect(esDelDueno(lista, 'b1', 'tab-ana', 0)).toBe(true)
  expect(esDelDueno(lista, 'b1', 'tab-luis', 0)).toBe(false)
  expect(esDelDueno(lista, 'b2', 'tab-ana', 0)).toBe(false)
})

test('leerPresencias flattens the presence state (one entry per tab)', () => {
  const estado = { ana: [p('ana', 'b1', 1), p('ana', null, 2)], luis: [p('luis', null, 3)] }
  expect(leerPresencias(estado).map((x) => x.desde)).toEqual([1, 2, 3])
})

test('personas lists everyone once, me first, then by name', () => {
  const lista = [p('Luis', null, 1), p('Ana', 'b1', 2), p('Luis', 'b2', 3), p('Zoe', null, 4)]
  expect(personas(lista, 'Zoe').map((x) => x.id_empleado)).toEqual(['Zoe', 'Ana', 'Luis'])
})
