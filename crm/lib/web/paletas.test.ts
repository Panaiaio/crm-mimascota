import { test, expect } from 'vitest'
import { PALETAS, avisosPaleta, paletaACss } from './paletas'

test('there are 6 preset palettes', () => {
  expect(PALETAS).toHaveLength(6)
})

test('every preset palette passes', () => {
  for (const { paleta } of PALETAS) expect(avisosPaleta(paleta)).toEqual([])
})

test('avisosPaleta flags low text contrast and says how to fix it', () => {
  const p = { ...PALETAS[0].paleta, texto: '#cccccc', fondo: '#ffffff' }
  expect(avisosPaleta(p)[0]).toMatchObject({ color: 'texto' })
  expect(avisosPaleta(p)[0].mensaje).toMatch(/más oscuro|más claro/)
})

test('avisosPaleta flags a primary colour that is too faint for graphics', () => {
  const p = { ...PALETAS[0].paleta, primario: '#eeeeee', sobre_primario: '#000000' }
  expect(avisosPaleta(p).map((a) => a.color)).toContain('primario')
})

test('paletaACss', () => {
  const css = paletaACss(PALETAS[0].paleta)
  expect(css).toContain('--primario:')
  expect(css).toContain(':root {')
})
