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
  Componente: ({ contenido, id }) => (
    <section id={id} className="b-testimonios">
      {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
      <ul>
        {lista(contenido, 'items').filter((it) => !sinContenido(it)).map((it, i) => (
          <li key={i}>
            <blockquote>
              {texto(it, 'cita') && <p>{texto(it, 'cita')}</p>}
              {texto(it, 'autor') && <footer>{texto(it, 'autor')}</footer>}
            </blockquote>
          </li>
        ))}
      </ul>
    </section>
  ),
}
