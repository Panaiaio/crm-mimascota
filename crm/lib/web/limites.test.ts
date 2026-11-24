import { test, expect } from 'vitest'
import { limites, MAX_EDITORES, MAX_PERSONAS } from './limites'

test('constants', () => {
  expect(MAX_EDITORES).toBe(3)
  expect(MAX_PERSONAS).toBe(6)
})

test('only the owner', () => {
  expect(limites([])).toEqual({ editores: 1, personas: 1, puedeEditor: true, puedeAnadir: true })
})

test('owner + 2 editors: no more editors', () => {
  const r = limites([{ rol: 'editor' }, { rol: 'editor' }])
  expect(r.editores).toBe(3)
  expect(r.puedeEditor).toBe(false)
  expect(r.puedeAnadir).toBe(true)
})

test('owner + 2 editors + 3 readers: nobody else', () => {
  const r = limites([
    { rol: 'editor' },
    { rol: 'editor' },
    { rol: 'lector' },
    { rol: 'lector' },
    { rol: 'lector' },
  ])
  expect(r.personas).toBe(6)
  expect(r.puedeAnadir).toBe(false)
})
