import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { zipSync } from 'fflate'
import { Sitio } from '@/components/web/Sitio'
import { BLOQUES } from '@/components/web/bloques'
import { PLANTILLAS } from './plantillas'
import { paletaACss } from './paletas'
import { SITIO_CSS } from './sitio.css'
import type { Bloque, CampoBloque, Web } from './tipos'

type Contenido = Record<string, unknown>

const AJUSTES = 'Ajustes de la web'
const basename = (ruta: string) => ruta.split('/').pop() ?? ruta
const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

export function nombreArchivo(nombre: string): string {
  const slug = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'web'
}

// Returns a copy of `contenido` where every image field (also inside lists) is replaced by `f(path)`.
function mapearImagenes(campos: CampoBloque[], contenido: Contenido, f: (ruta: string) => string): Contenido {
  const salida: Contenido = { ...contenido }
  for (const c of campos) {
    const v = contenido[c.clave]
    if (c.tipo === 'imagen' && typeof v === 'string' && v !== '') salida[c.clave] = f(v)
    else if (c.tipo === 'lista' && c.campos && Array.isArray(v)) {
      const sub = c.campos
      salida[c.clave] = v.map((it) => (typeof it === 'object' && it !== null ? mapearImagenes(sub, it as Contenido, f) : it))
    }
  }
  return salida
}

// Every image path with the human name of the place that uses it.
function imagenesUsadas(web: Web, bloques: Bloque[]): { ruta: string; donde: string }[] {
  const usadas: { ruta: string; donde: string }[] = []
  if (web.ajustes.logo) usadas.push({ ruta: web.ajustes.logo, donde: AJUSTES })
  for (const b of bloques) {
    const def = BLOQUES[b.tipo]
    mapearImagenes(def.campos, b.contenido, (ruta) => {
      usadas.push({ ruta, donde: def.nombre })
      return ruta
    })
  }
  return usadas
}

export function rutasImagenes(web: Web, bloques: Bloque[]): string[] {
  return [...new Set(imagenesUsadas(web, bloques).map((i) => i.ruta))]
}

export function generarSitio(web: Web, bloques: Bloque[], imagenes: Record<string, Uint8Array>): Record<string, Uint8Array> {
  // An image that could not be downloaded is blanked so no broken <img> is rendered.
  const disponible = (ruta: string) => (ruta in imagenes ? ruta : '')
  const ajustes = { ...web.ajustes, logo: web.ajustes.logo ? disponible(web.ajustes.logo) : null }
  const conImagenes = bloques.map((b) => ({ ...b, contenido: mapearImagenes(BLOQUES[b.tipo].campos, b.contenido, disponible) }))
  const cuerpo = renderToStaticMarkup(
    createElement(Sitio, { web: { nombre: web.nombre, ajustes }, bloques: conImagenes, imagen: (ruta) => `imagenes/${basename(ruta)}` }),
  )
  const descripcion = web.ajustes.descripcion ? `<meta name="description" content="${escapar(web.ajustes.descripcion)}">\n` : ''
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(web.ajustes.titulo || web.nombre)}</title>
${descripcion}<link rel="stylesheet" href="estilos.css">
</head>
<body>
${cuerpo}
</body>
</html>
`
  // Palette variables live on `.sitio` (not :root) to match the editor preview.
  const css = `${paletaACss(web.paleta).replace(':root', '.sitio')}
.sitio { --fuente: ${PLANTILLAS[web.plantilla].fuente}; }
body { margin: 0; }
${SITIO_CSS}`
  const enc = new TextEncoder()
  const ficheros: Record<string, Uint8Array> = { 'index.html': enc.encode(html), 'estilos.css': enc.encode(css) }
  for (const ruta of rutasImagenes(web, bloques)) {
    if (ruta in imagenes) ficheros[`imagenes/${basename(ruta)}`] = imagenes[ruta]
  }
  return ficheros
}

// Browser only: uses document and URL.createObjectURL.
export async function exportarWeb(
  web: Web,
  bloques: Bloque[],
  descargar: (ruta: string) => Promise<Uint8Array | null>,
): Promise<{ faltan: string[] }> {
  const imagenes: Record<string, Uint8Array> = {}
  for (const ruta of rutasImagenes(web, bloques)) {
    const datos = await descargar(ruta)
    if (datos) imagenes[ruta] = datos
  }
  const faltan = [...new Set(imagenesUsadas(web, bloques).filter((i) => !(i.ruta in imagenes)).map((i) => i.donde))]
  const zip = zipSync(generarSitio(web, bloques, imagenes))
  const url = URL.createObjectURL(new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivo(web.nombre)}.zip`
  a.click()
  URL.revokeObjectURL(url)
  return { faltan }
}
