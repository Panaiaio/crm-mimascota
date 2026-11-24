import type { DefBloque } from '@/lib/web/tipos'
import { lista, sinContenido, texto } from './util'

export const servicios: DefBloque = {
  tipo: 'servicios',
  nombre: 'Servicios',
  descripcion: 'Tarjetas con lo que ofreces.',
  campos: [
    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 80 },
    {
      clave: 'items',
      etiqueta: 'Tarjetas',
      tipo: 'lista',
      elemento: 'tarjeta',
      max: 9,
      campos: [
        { clave: 'titulo', etiqueta: 'Nombre', tipo: 'texto', max: 60, obligatorio: true },
        { clave: 'texto', etiqueta: 'Descripción', tipo: 'textoLargo', max: 240 },
      ],
    },
  ],
  porDefecto: {
    titulo: 'Nuestros servicios',
    items: [
      { titulo: 'Primer servicio', texto: 'Describe en pocas palabras qué incluye.' },
      { titulo: 'Segundo servicio', texto: 'Describe en pocas palabras qué incluye.' },
      { titulo: 'Tercer servicio', texto: 'Describe en pocas palabras qué incluye.' },
    ],
  },
  vacio: sinContenido,
  Componente: ({ contenido, id }) => {
    const items = lista(contenido, 'items').filter((it) => !sinContenido(it))
    return (
      <section id={id} className="b-tarjetas">
        {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
        {items.length > 0 && (
          <ul>
            {items.map((it, i) => (
              <li key={i}>
                {texto(it, 'titulo') && <h3>{texto(it, 'titulo')}</h3>}
                {texto(it, 'texto') && <p>{texto(it, 'texto')}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  },
}
