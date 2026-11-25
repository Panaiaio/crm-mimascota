/* eslint-disable @next/next/no-img-element -- plain <img> is required: the same markup is exported as static HTML */
import type { DefBloque } from '@/lib/web/tipos'
import { enlaceSeguro, sinContenido, texto } from './util'

export const cabecera: DefBloque = {
  tipo: 'cabecera',
  nombre: 'Cabecera',
  descripcion: 'Título grande con subtítulo, botón e imagen.',
  campos: [
    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 80, obligatorio: true },
    { clave: 'subtitulo', etiqueta: 'Subtítulo', tipo: 'textoLargo', max: 240 },
    { clave: 'boton', etiqueta: 'Texto del botón', tipo: 'texto', max: 40 },
    { clave: 'enlace', etiqueta: 'Enlace del botón', tipo: 'enlace' },
    { clave: 'imagen', etiqueta: 'Imagen', tipo: 'imagen' },
    { clave: 'alt', etiqueta: 'Descripción de la imagen', tipo: 'texto', max: 140 },
  ],
  porDefecto: { titulo: 'Un título que presente tu proyecto', subtitulo: 'Cuenta en una frase qué haces y a quién ayudas.', boton: 'Escríbenos', enlace: 'mailto:hola@ejemplo.com', imagen: '', alt: '' },
  vacio: sinContenido,
  Componente: ({ contenido, imagen, id }) => {
    const enlace = enlaceSeguro(texto(contenido, 'enlace'))
    const boton = texto(contenido, 'boton')
    const ruta = texto(contenido, 'imagen')
    return (
      <section id={id} className="b-cabecera">
        <div className="b-cabecera-texto">
          {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
          {texto(contenido, 'subtitulo') && <p>{texto(contenido, 'subtitulo')}</p>}
          {boton && enlace && <a className="b-boton" href={enlace}>{boton}</a>}
        </div>
        {ruta && <img className="b-cabecera-imagen" src={imagen(ruta)} alt={texto(contenido, 'alt')} />}
      </section>
    )
  },
}
