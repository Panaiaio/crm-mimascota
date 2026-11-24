import { expect, test } from 'vitest'
import { duenoDelBloque, leerPresencias, personas, type Presencia } from './presencia'

const p = (id: string, bloque: string | null, desde: number, activo = 0): Presencia =>
  ({ id_empleado: id, nombre: id, rol: 'editor', bloque, desde, activo })

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

test('leerPresencias flattens the presence state (one entry per tab)', () => {
  const estado = { ana: [p('ana', 'b1', 1), p('ana', null, 2)], luis: [p('luis', null, 3)] }
  expect(leerPresencias(estado).map((x) => x.desde)).toEqual([1, 2, 3])
})

test('personas lists everyone else once, sorted by name', () => {
  const lista = [p('Luis', null, 1), p('Ana', 'b1', 2), p('Luis', 'b2', 3), p('Yo', null, 4)]
  expect(personas(lista, 'Yo').map((x) => x.id_empleado)).toEqual(['Ana', 'Luis'])
})
