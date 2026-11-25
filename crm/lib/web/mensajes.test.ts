import { expect, test } from 'vitest'
import { leerAjustes, leerContenido, MAX_CONTENIDO } from './mensajes'
import { PALETAS } from './paletas'

const de = { id_empleado: 'e1', tab: 't1' }

test('leerContenido accepts a plain object content from a known sender', () => {
  expect(leerContenido({ ...de, id_bloque: 'b1', contenido: { titulo: 'Hola' } })).toEqual({ ...de, id_bloque: 'b1', contenido: { titulo: 'Hola' } })
})

test('leerContenido rejects anything else', () => {
  for (const contenido of [null, [], 'texto', 3, undefined]) {
    expect(leerContenido({ ...de, id_bloque: 'b1', contenido })).toBeNull()
  }
  expect(leerContenido({ id_bloque: 'b1', contenido: {} })).toBeNull()
  expect(leerContenido({ ...de, id_bloque: 7, contenido: {} })).toBeNull()
  expect(leerContenido(null)).toBeNull()
  expect(leerContenido({ ...de, id_bloque: 'b1', contenido: { t: 'x'.repeat(MAX_CONTENIDO) } })).toBeNull()
})

test('leerAjustes keeps only the valid fields', () => {
  const paleta = PALETAS[0].paleta
  const ajustes = { titulo: 'T', pie: '', descripcion: '', logo: null }
  expect(leerAjustes({ ...de, nombre: 'Web', paleta, ajustes, id_dueno_fk: 'x' })).toEqual({ ...de, cambios: { nombre: 'Web', paleta, ajustes } })
  const malo = leerAjustes({
    ...de,
    nombre: 123,
    paleta: { ...paleta, fondo: 'red' },
    ajustes: { ...ajustes, logo: 5 },
  })
  expect(malo).toEqual({ ...de, cambios: {} })
  expect(leerAjustes({ ...de, nombre: 'x'.repeat(121) })?.cambios).toEqual({})
})

test('leerAjustes drops extra keys inside the palette and settings', () => {
  const r = leerAjustes({ ...de, paleta: { ...PALETAS[0].paleta, extra: '#000000' }, ajustes: { titulo: '', pie: '', descripcion: '', logo: 'webs/a.png', x: 1 } })
  expect(Object.keys(r?.cambios.paleta ?? {})).not.toContain('extra')
  expect(r?.cambios.ajustes).toEqual({ titulo: '', pie: '', descripcion: '', logo: 'webs/a.png' })
})

test('leerAjustes needs a sender', () => {
  expect(leerAjustes({ nombre: 'Web' })).toBeNull()
})
