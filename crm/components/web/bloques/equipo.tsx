/* eslint-disable @next/next/no-img-element -- plain <img> is required: the same markup is exported as static HTML */
import type { DefBloque } from '@/lib/web/tipos'
import { lista, sinContenido, texto } from './util'

export const equipo: DefBloque = {
  tipo: 'equipo',
  nombre: 'Equipo',
  descripcion: 'Personas con foto, nombre y cargo.',
  campos: [
    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 80 },
    {
      clave: 'items',
      etiqueta: 'Personas',
      tipo: 'lista',
      max: 12,
      campos: [
        { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', max: 60, obligatorio: true },
        { clave: 'cargo', etiqueta: 'Cargo', tipo: 'texto', max: 60 },
        { clave: 'foto', etiqueta: 'Foto', tipo: 'imagen' },
        { clave: 'alt', etiqueta: 'Descripción de la foto', tipo: 'texto', max: 140 },
      ],
    },
  ],
  porDefecto: {
    titulo: 'Quién está detrás',
    items: [
      { nombre: 'Nombre y apellidos', cargo: 'Cargo o especialidad', foto: '', alt: '' },
      { nombre: 'Nombre y apellidos', cargo: 'Cargo o especialidad', foto: '', alt: '' },
    ],
  },
  vacio: sinContenido,
  Componente: ({ contenido, imagen, id }) => {
    const items = lista(contenido, 'items').filter((it) => !sinContenido(it))
    return (
      <section id={id} className="b-equipo">
        {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
        {items.length > 0 && (
          <ul>
            {items.map((it, i) => (
              <li key={i}>
                {texto(it, 'foto') && <img src={imagen(texto(it, 'foto'))} alt={texto(it, 'alt')} />}
                {texto(it, 'nombre') && <h3>{texto(it, 'nombre')}</h3>}
                {texto(it, 'cargo') && <p>{texto(it, 'cargo')}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  },
}
