import type { DefBloque } from '@/lib/web/tipos'
import { lista, sinContenido, texto } from './util'

export const testimonios: DefBloque = {
  tipo: 'testimonios',
  nombre: 'Testimonios',
  descripcion: 'Opiniones de clientes.',
  campos: [
    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 80 },
    {
      clave: 'items',
      etiqueta: 'Opiniones',
      tipo: 'lista',
      max: 6,
      campos: [
        { clave: 'cita', etiqueta: 'Opinión', tipo: 'textoLargo', max: 300, obligatorio: true },
        { clave: 'autor', etiqueta: 'Autor', tipo: 'texto', max: 60 },
      ],
    },
  ],
  porDefecto: {
    titulo: 'Lo que dicen de nosotros',
    items: [
      { cita: 'Escribe aquí la opinión de un cliente satisfecho.', autor: 'Nombre del cliente' },
      { cita: 'Escribe aquí otra opinión.', autor: 'Nombre del cliente' },
    ],
  },
  vacio: sinContenido,
  Componente: ({ contenido, id }) => {
    const items = lista(contenido, 'items').filter((it) => !sinContenido(it))
    return (
      <section id={id} className="b-testimonios">
        {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
        {items.length > 0 && (
          <ul>
            {items.map((it, i) => (
              <li key={i}>
                <figure>
                  {texto(it, 'cita') && <blockquote><p>{texto(it, 'cita')}</p></blockquote>}
                  {texto(it, 'autor') && <figcaption>{texto(it, 'autor')}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  },
}
