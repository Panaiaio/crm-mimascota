import { expect, test } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BLOQUES } from './index'
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
    for (const b of p.bloques) expect(BLOQUES[b.tipo].vacio(b.contenido)).toBe(false)
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

test('unsafe links are dropped', () => {
  const html = renderToStaticMarkup(<BLOQUES.llamada.Componente contenido={{ titulo: 'T', boton: 'Ir', enlace: 'javascript:alert(1)' }} imagen={img} id="b" />)
  expect(html).not.toContain('javascript:')
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
