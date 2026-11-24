import type { DefBloque } from '@/lib/web/tipos'
import { enlaceSeguro, sinContenido, texto } from './util'

export const llamada: DefBloque = {
  tipo: 'llamada',
  nombre: 'Llamada a la acción',
  descripcion: 'Un mensaje destacado con un botón.',
  campos: [
    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 80, obligatorio: true },
    { clave: 'texto', etiqueta: 'Texto', tipo: 'textoLargo', max: 240 },
    { clave: 'boton', etiqueta: 'Texto del botón', tipo: 'texto', max: 40 },
    { clave: 'enlace', etiqueta: 'Enlace del botón', tipo: 'enlace' },
  ],
  porDefecto: { titulo: 'Hablemos de tu proyecto', texto: 'Escríbenos y te respondemos en un día laborable.', boton: 'Contactar', enlace: 'mailto:hola@ejemplo.com' },
  vacio: sinContenido,
  Componente: ({ contenido, id }) => {
    const enlace = enlaceSeguro(texto(contenido, 'enlace'))
    const boton = texto(contenido, 'boton')
    return (
      <section id={id} className="b-llamada">
        {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
        {texto(contenido, 'texto') && <p>{texto(contenido, 'texto')}</p>}
        {boton && enlace && <a className="b-boton" href={enlace}>{boton}</a>}
      </section>
    )
  },
}
