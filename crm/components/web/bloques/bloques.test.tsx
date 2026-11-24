import { expect, test } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BLOQUES } from './index'
import { enlaceSeguro } from './util'
import { Sitio } from '../Sitio'
import { PLANTILLAS } from '@/lib/web/plantillas'
import { PALETAS } from '@/lib/web/paletas'
import type { Bloque, ResolverImagen } from '@/lib/web/tipos'

const img: ResolverImagen = (r) => `imagenes/${r.split('/').pop()}`

test.each(Object.values(BLOQUES))('$tipo renders its defaults accessibly', (def) => {
  const html = renderToStaticMarkup(<def.Componente contenido={def.porDefecto} imagen={img} id="b1" />)
  expect(html).toMatch(/^<section[^>]*id="b1"/)
  expect(html).not.toContain('<script')
  expect(html).not.toMatch(/<h1/)
  for (const tag of html.match(/<img[^>]*>/g) ?? []) expect(tag).toMatch(/alt="/)
})

test('text is escaped', () => {
  const html = renderToStaticMarkup(<BLOQUES.texto.Componente contenido={{ titulo: '<b>&"', texto: 'x' }} imagen={img} id="b" />)
  expect(html).toContain('&lt;b&gt;&amp;&quot;')
})

test('preguntas uses details/summary', () => {
  expect(renderToStaticMarkup(<BLOQUES.preguntas.Componente contenido={BLOQUES.preguntas.porDefecto} imagen={img} id="b" />)).toContain('<details')
})

test('templates only use known block types and vacia is empty', () => {
  for (const p of Object.values(PLANTILLAS)) for (const b of p.bloques) expect(BLOQUES[b.tipo]).toBeDefined()
  expect(PLANTILLAS.vacia.bloques).toEqual([])
})

test('templates reference existing palettes and render without empty blocks', () => {
  for (const p of Object.values(PLANTILLAS)) {
    expect(PALETAS.some((x) => x.id === p.paleta)).toBe(true)
    for (const b of p.bloques) if (b.tipo !== 'galeria') expect(BLOQUES[b.tipo].vacio(b.contenido)).toBe(false) // galleries start without images
  }
})

test('vacio detects blocks without visible content', () => {
  expect(BLOQUES.texto.vacio({ titulo: '', texto: '  ' })).toBe(true)
  expect(BLOQUES.servicios.vacio({ titulo: '', items: [{ titulo: '', texto: '' }] })).toBe(true)
  expect(BLOQUES.galeria.vacio({ titulo: '', items: [{ imagen: '', alt: 'solo alt' }] })).toBe(true)
  expect(BLOQUES.texto.vacio({ titulo: 'Hola', texto: '' })).toBe(false)
})

test('image without path renders no img', () => {
  const html = renderToStaticMarkup(<BLOQUES.cabecera.Componente contenido={{ titulo: 'T', imagen: '', alt: '' }} imagen={img} id="b" />)
  expect(html).not.toContain('<img')
})

test.each([
  'javascript:alert(1)',
  'java\tscript:alert(1)',
  'java\nscript:alert(1)',
  'java\rscript:alert(1)',
  '\u0001javascript:alert(1)',
  '  JaVaScRiPt:alert(1)',
  'data:text/html,x',
])('unsafe link %j is dropped', (enlace) => {
  expect(enlaceSeguro(enlace)).toBeUndefined()
  const html = renderToStaticMarkup(<BLOQUES.llamada.Componente contenido={{ titulo: 'T', boton: 'Ir', enlace }} imagen={img} id="b" />)
  expect(html).not.toContain('<a')
  expect(html).not.toContain('script:')
})

test('safe links are kept', () => {
  for (const e of ['https://a.es/x', 'mailto:a@b.es', 'tel:910000000', '#x', '/ruta', 'pagina.html']) expect(enlaceSeguro(e)).toBe(e)
})

test('templates and defaults have no internal anchors', () => {
  for (const p of Object.values(PLANTILLAS)) expect(JSON.stringify(p.bloques)).not.toContain('"#')
  for (const d of Object.values(BLOQUES)) expect(JSON.stringify(d.porDefecto)).not.toContain('"#')
})

test('ill-typed content does not throw and renders no lists', () => {
  const malo = { titulo: 5, texto: 7, items: 'x', imagen: 3, enlace: {} }
  for (const def of Object.values(BLOQUES)) {
    expect(() => def.vacio(malo)).not.toThrow()
    const html = renderToStaticMarkup(<def.Componente contenido={malo} imagen={img} id="b" />)
    expect(html).not.toContain('<ul')
  }
})

test('galeria is empty without images; contacto skips tel without digits; testimonial author is outside blockquote', () => {
  expect(BLOQUES.galeria.vacio({ titulo: 'T', items: [{ imagen: '', pie: 'p' }] })).toBe(true)
  expect(BLOQUES.galeria.vacio({ items: [{ imagen: 'a/b.png', alt: '' }] })).toBe(false)
  expect(renderToStaticMarkup(<BLOQUES.contacto.Componente contenido={{ telefono: 'ninguno' }} imagen={img} id="b" />)).not.toContain('tel:')
  const t = renderToStaticMarkup(<BLOQUES.testimonios.Componente contenido={{ items: [{ cita: 'c', autor: 'a' }] }} imagen={img} id="b" />)
  expect(t).toContain('</blockquote><figcaption>a</figcaption>')
})

test('Sitio has one h1, sorted blocks, anchor menu and skips empty blocks', () => {
  const b = (id: string, orden: number, tipo: Bloque['tipo'], contenido: Record<string, unknown>): Bloque => ({
    id_bloque: id, id_web_fk: 'w', tipo, orden, contenido,
  })
  const html = renderToStaticMarkup(
    <Sitio
      web={{ nombre: 'Mi sitio', ajustes: { titulo: 'Titulo web', logo: null, pie: 'Pie de pagina', descripcion: '' } }}
      bloques={[b('b2', 2, 'texto', { titulo: 'Segundo', texto: 'x' }), b('b1', 1, 'texto', { titulo: 'Primero', texto: 'x' }), b('b3', 3, 'texto', { titulo: '', texto: '' })]}
      imagen={img}
    />,
  )
  expect(html).toMatch(/^<div class="sitio"/)
  expect(html.match(/<h1/g)).toHaveLength(1)
  expect(html).toContain('Titulo web')
  expect(html).toContain('href="#b1"')
  expect(html).not.toContain('id="b3"')
  expect(html.indexOf('Primero')).toBeLessThan(html.indexOf('Segundo'))
  expect(html).toContain('Pie de pagina')
})

test('Sitio renders no footer without footer text', () => {
  const html = renderToStaticMarkup(
    <Sitio web={{ nombre: 'N', ajustes: { titulo: '', logo: null, pie: '', descripcion: '' } }} bloques={[]} imagen={img} />,
  )
  expect(html).not.toContain('<footer')
})
