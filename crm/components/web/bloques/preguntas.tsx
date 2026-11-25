import type { DefBloque } from '@/lib/web/tipos'
import { lista, sinContenido, texto } from './util'

export const preguntas: DefBloque = {
  tipo: 'preguntas',
  nombre: 'Preguntas frecuentes',
  descripcion: 'Preguntas que se abren para mostrar la respuesta.',
  campos: [
    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 80 },
    {
      clave: 'items',
      etiqueta: 'Preguntas',
      tipo: 'lista',
      elemento: 'pregunta',
      max: 12,
      campos: [
        { clave: 'pregunta', etiqueta: 'Pregunta', tipo: 'texto', max: 120, obligatorio: true },
        { clave: 'respuesta', etiqueta: 'Respuesta', tipo: 'textoLargo', max: 600 },
      ],
    },
  ],
  porDefecto: {
    titulo: 'Preguntas frecuentes',
    items: [
      { pregunta: 'Primera pregunta', respuesta: 'Escribe aquí la respuesta.' },
      { pregunta: 'Segunda pregunta', respuesta: 'Escribe aquí la respuesta.' },
    ],
  },
  vacio: sinContenido,
  Componente: ({ contenido, id }) => (
    <section id={id} className="b-preguntas">
      {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
      {lista(contenido, 'items').filter((it) => texto(it, 'pregunta') !== '').map((it, i) => (
        <details key={i}>
          <summary>{texto(it, 'pregunta')}</summary>
          {texto(it, 'respuesta') && <p>{texto(it, 'respuesta')}</p>}
        </details>
      ))}
    </section>
  ),
}
