/* eslint-disable @next/next/no-img-element -- plain <img> is required: the same markup is exported as static HTML */
import type { DefBloque } from '@/lib/web/tipos'
import { lista, sinContenido, texto } from './util'

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
  vacio: sinContenido,
  Componente: ({ contenido, imagen, id }) => (
    <section id={id} className="b-galeria">
      {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
      <ul>
        {lista(contenido, 'items').filter((it) => texto(it, 'imagen') !== '').map((it, i) => (
          <li key={i}>
            <figure>
              <img src={imagen(texto(it, 'imagen'))} alt={texto(it, 'alt')} />
              {texto(it, 'pie') && <figcaption>{texto(it, 'pie')}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
    </section>
  ),
}
