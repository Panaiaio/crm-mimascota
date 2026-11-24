import type { DefBloque } from '@/lib/web/tipos'
import { sinContenido, texto } from './util'

export const bloqueTexto: DefBloque = {
  tipo: 'texto',
  nombre: 'Texto',
  descripcion: 'Un título y uno o varios párrafos.',
  campos: [
    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 80 },
    { clave: 'texto', etiqueta: 'Texto', tipo: 'textoLargo', max: 2000, obligatorio: true },
  ],
  porDefecto: { titulo: 'Sobre nosotros', texto: 'Escribe aquí tu texto. Separa los párrafos con una línea en blanco.' },
  vacio: sinContenido,
  Componente: ({ contenido, id }) => (
    <section id={id} className="b-texto">
      {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
      {texto(contenido, 'texto')
        .split(/\n{2,}/)
        .filter((p) => p.trim() !== '')
        .map((p, i) => <p key={i}>{p}</p>)}
    </section>
  ),
}
