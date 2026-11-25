import { test, expect } from 'vitest'
import { nombrePersona, motivoBloqueo, otrosDe, MOTIVO_EDITORES, MOTIVO_PERSONAS } from './seleccionColaboradores'

const actuales = [
  { id_empleado: 'a', rol: 'editor' as const },
  { id_empleado: 'b', rol: 'lector' as const },
]

test('others apply pending changes and additions and leave the person out', () => {
  const otros = otrosDe(actuales, { b: 'editor' }, { n: 'lector' }, 'a')
  expect(otros).toEqual([{ id: 'b', rol: 'editor' }, { id: 'n', rol: 'lector' }])
})

test('free site: nothing blocked', () => {
  expect(motivoBloqueo(otrosDe(actuales, {}, {}, 'n'), 'editor', true)).toBeNull()
})

test('pending editors count toward the editor limit', () => {
  const otros = otrosDe(actuales, {}, { n: 'editor' }, 'm')
  expect(motivoBloqueo(otros, 'editor', true)).toBe(MOTIVO_EDITORES)
  expect(motivoBloqueo(otros, 'lector', true)).toBeNull()
})

test('pending additions count toward the people limit', () => {
  const otros = otrosDe(actuales, {}, { n1: 'lector', n2: 'lector', n3: 'lector' }, 'm')
  expect(motivoBloqueo(otros, 'lector', true)).toBe(MOTIVO_PERSONAS)
})

test('an existing person is not blocked by the people limit, only by editors', () => {
  const lleno = [...actuales, ...['c', 'd', 'e'].map((id) => ({ id_empleado: id, rol: 'lector' as const }))]
  expect(motivoBloqueo(otrosDe(lleno, {}, {}, 'b'), 'lector', false)).toBeNull()
  const editores = [{ id_empleado: 'a', rol: 'editor' as const }, { id_empleado: 'b', rol: 'editor' as const }, { id_empleado: 'c', rol: 'lector' as const }]
  expect(motivoBloqueo(otrosDe(editores, {}, {}, 'c'), 'editor', false)).toBe(MOTIVO_EDITORES)
})

test('person names flag inactive and missing employees', () => {
  expect(nombrePersona({ nombre: 'Ana', apellidos: 'Gil', activo: true })).toBe('Ana Gil')
  expect(nombrePersona({ nombre: 'Ana', apellidos: null, activo: false })).toBe('Ana (inactivo)')
  expect(nombrePersona(undefined)).toBe('(empleado sin datos)')
})
