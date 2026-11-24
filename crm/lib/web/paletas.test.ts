import { test, expect } from 'vitest'
import { PALETAS, avisosPaleta, paletaACss, paletaAVariables } from './paletas'

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

test('paletaAVariables', () => {
  const v = paletaAVariables(PALETAS[0].paleta)
  expect(v['--fondo']).toBe(PALETAS[0].paleta.fondo)
  expect(Object.keys(v)).toHaveLength(6)
})

test('avisosPaleta checks soft text on cards, links on the background and buttons on cards', () => {
  const base = PALETAS[0].paleta
  expect(avisosPaleta({ ...base, texto_suave: '#a1a1aa' }).map((a) => a.color)).toContain('texto_suave')
  // 3.5:1 on white: enough for graphics, not for link text
  expect(avisosPaleta({ ...base, primario: '#8a8a8a', sobre_primario: '#000000' }).map((a) => a.mensaje)).toEqual(
    expect.arrayContaining([expect.stringMatching(/^Los enlaces sobre el fondo/)]),
  )
  expect(
    avisosPaleta({ ...base, superficie: '#18181b', texto: '#ffffff', texto_suave: '#ffffff' }).map((a) => a.mensaje),
  ).toEqual(expect.arrayContaining([expect.stringMatching(/^Los botones sobre las tarjetas/)]))
})

test('paletaACss leaves out any value that is not #rrggbb', () => {
  const p = { ...PALETAS[0].paleta, fondo: 'red;} body{display:none', texto: '#12345' }
  const css = paletaACss(p)
  expect(css).not.toContain('--fondo')
  expect(css).not.toContain('--texto:')
  expect(css).not.toContain('display')
  expect(css).toContain('--primario: #18181b;')
})
