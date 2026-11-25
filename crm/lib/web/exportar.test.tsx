import { afterEach, expect, test, vi } from 'vitest'
import { exportarWeb, generarSitio, nombreArchivo, rutasImagenes, soloImagenesDisponibles } from './exportar'
import { PLANTILLAS } from './plantillas'
import { PALETAS } from './paletas'
import type { Bloque, Web } from './tipos'

const webDePrueba: Web = {
  id_web: 'w1',
  nombre: 'Mi negocio',
  plantilla: 'negocio',
  paleta: PALETAS.find((p) => p.id === PLANTILLAS.negocio.paleta)!.paleta,
  ajustes: { titulo: '', logo: null, pie: 'Pie', descripcion: 'Una "descripción"' },
  id_dueno_fk: 'u1',
  creada: '',
  actualizada: '',
}
const bloquesDePrueba: Bloque[] = PLANTILLAS.negocio.bloques.map((b, i) => ({
  id_bloque: `b${i}`,
  id_web_fk: 'w1',
  tipo: b.tipo,
  orden: i,
  contenido: i === 0 ? { ...b.contenido, imagen: 'w1/a.jpg' } : b.contenido,
}))
const bloqueVacio: Bloque = { id_bloque: 'vacio-1', id_web_fk: 'w1', tipo: 'texto', orden: 0, contenido: { titulo: '', texto: '' } }
const bloqueConImagenQueFalta: Bloque = {
  id_bloque: 'img-1',
  id_web_fk: 'w1',
  tipo: 'cabecera',
  orden: 1,
  contenido: { titulo: 'Hola', imagen: 'w1/falta.png', alt: 'x' },
}

test('nombreArchivo', () => {
  expect(nombreArchivo('Café "La Plaza"/2026')).toBe('cafe-la-plaza-2026')
  expect(nombreArchivo('  ')).toBe('web')
})

test('generarSitio produces a standalone accessible page', () => {
  const f = generarSitio(webDePrueba, bloquesDePrueba, { 'w1/a.jpg': new Uint8Array([1]) })
  const html = new TextDecoder().decode(f['index.html'])
  expect(Object.keys(f).sort()).toEqual(['estilos.css', 'imagenes/a.jpg', 'index.html'])
  expect(html).toMatch(/^<!doctype html>/i)
  expect(html).toContain('<html lang="es">')
  expect(html).toContain('name="viewport"')
  expect(html).toContain('href="estilos.css"')
  expect(html).toContain('<title>Mi negocio</title>')
  expect(html).toContain('content="Una &quot;descripción&quot;"')
  expect(html).toContain('src="imagenes/a.jpg"')
  expect(html).not.toContain('<script')
  expect(html).not.toContain('supabase')
})

test('estilos.css declares palette and font on .sitio', () => {
  const css = new TextDecoder().decode(generarSitio(webDePrueba, bloquesDePrueba, {})['estilos.css'])
  expect(css).toContain('.sitio {\n  --fondo:')
  expect(css).toContain('--fuente: system-ui')
  expect(css).not.toContain(':root')
})

test('empty blocks are skipped and missing images left out', () => {
  const f = generarSitio(webDePrueba, [bloqueVacio, bloqueConImagenQueFalta], {})
  const html = new TextDecoder().decode(f['index.html'])
  expect(html).not.toContain(bloqueVacio.id_bloque)
  expect(html).not.toMatch(/<img/)
  expect(html).toContain('Hola')
})

test('rutasImagenes lists logo and block images once', () => {
  const web = { ...webDePrueba, ajustes: { ...webDePrueba.ajustes, logo: 'w1/logo.png' } }
  expect(rutasImagenes(web, [...bloquesDePrueba, bloqueConImagenQueFalta]).sort()).toEqual(['w1/a.jpg', 'w1/falta.png', 'w1/logo.png'])
})

test('soloImagenesDisponibles blanks images that are not available', () => {
  const web = { ...webDePrueba, ajustes: { ...webDePrueba.ajustes, logo: 'w1/logo.png' } }
  const r = soloImagenesDisponibles(web, [bloqueConImagenQueFalta, bloquesDePrueba[0]], (ruta) => ruta === 'w1/a.jpg')
  expect(r.web.ajustes.logo).toBe('')
  expect(r.bloques[0].contenido.imagen).toBe('')
  expect(r.bloques[1].contenido.imagen).toBe('w1/a.jpg')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('exportarWeb counts a throwing download as missing and revokes the URL later', async () => {
  vi.useFakeTimers()
  const click = vi.fn()
  vi.stubGlobal('document', { createElement: () => ({ click }) })
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:zip')
  const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const descargar = vi.fn(async (ruta: string) => {
    if (ruta === 'w1/falta.png') throw new Error('red')
    return new Uint8Array([1])
  })

  const { faltan } = await exportarWeb(webDePrueba, [...bloquesDePrueba, bloqueConImagenQueFalta], descargar)

  expect(faltan).toEqual(['Cabecera'])
  expect(click).toHaveBeenCalledOnce()
  expect(revocar).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1000)
  expect(revocar).toHaveBeenCalledWith('blob:zip')
})
