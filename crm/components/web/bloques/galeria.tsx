/* eslint-disable @next/next/no-img-element -- plain <img> is required: the same markup is exported as static HTML */
import type { DefBloque } from '@/lib/web/tipos'
import { lista, texto } from './util'

const imagenes = (c: Record<string, unknown>) => lista(c, 'items').filter((it) => texto(it, 'imagen').trim() !== '')

export const galeria: DefBloque = {
  tipo: 'galeria',
  nombre: 'Galería',
  descripcion: 'Una cuadrícula de imágenes con pie opcional.',
  campos: [
    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 80 },
    {
      clave: 'items',
      etiqueta: 'Imágenes',
      tipo: 'lista',
      max: 12,
      campos: [
        { clave: 'imagen', etiqueta: 'Imagen', tipo: 'imagen', obligatorio: true },
        { clave: 'alt', etiqueta: 'Descripción de la imagen', tipo: 'texto', max: 140 },
        { clave: 'pie', etiqueta: 'Pie de foto', tipo: 'texto', max: 80 },
      ],
    },
  ],
  porDefecto: { titulo: 'Galería', items: [] },
  // Only images count as content: a title or captions alone render nothing useful.
  vacio: (c) => imagenes(c).length === 0,
  Componente: ({ contenido, imagen, id }) => {
    const items = imagenes(contenido)
    return (
      <section id={id} className="b-galeria">
        {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
        {items.length > 0 && (
          <ul>
            {items.map((it, i) => (
              <li key={i}>
                <figure>
                  <img src={imagen(texto(it, 'imagen'))} alt={texto(it, 'alt')} />
                  {texto(it, 'pie') && <figcaption>{texto(it, 'pie')}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  },
}
