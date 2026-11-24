import type { DefBloque } from '@/lib/web/tipos'
import { enlaceSeguro, sinContenido, texto } from './util'

export const contacto: DefBloque = {
  tipo: 'contacto',
  nombre: 'Contacto',
  descripcion: 'Dirección, teléfono, correo, horario y enlace al mapa.',
  campos: [
    { clave: 'titulo', etiqueta: 'Título', tipo: 'texto', max: 80 },
    { clave: 'direccion', etiqueta: 'Dirección', tipo: 'textoLargo', max: 200 },
    { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', max: 30 },
    { clave: 'email', etiqueta: 'Correo electrónico', tipo: 'texto', max: 80 },
    { clave: 'horario', etiqueta: 'Horario', tipo: 'textoLargo', max: 200 },
    { clave: 'mapa', etiqueta: 'Enlace al mapa', tipo: 'enlace' },
  ],
  porDefecto: {
    titulo: 'Contacto',
    direccion: 'Calle Mayor 1, 28001 Madrid',
    telefono: '600 000 000',
    email: 'hola@ejemplo.com',
    horario: 'De lunes a viernes, de 9:00 a 18:00',
    mapa: '',
  },
  vacio: sinContenido,
  Componente: ({ contenido, id }) => {
    const telefono = texto(contenido, 'telefono')
    const digitos = telefono.replace(/[^\d+]/g, '')
    const email = texto(contenido, 'email')
    const mapa = enlaceSeguro(texto(contenido, 'mapa'))
    return (
      <section id={id} className="b-contacto">
        {texto(contenido, 'titulo') && <h2>{texto(contenido, 'titulo')}</h2>}
        <dl>
          {texto(contenido, 'direccion') && (<><dt>Dirección</dt><dd>{texto(contenido, 'direccion')}</dd></>)}
          {telefono && (<><dt>Teléfono</dt><dd>{/\d/.test(digitos) ? <a href={`tel:${digitos}`}>{telefono}</a> : telefono}</dd></>)}
          {email && (<><dt>Correo electrónico</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></>)}
          {texto(contenido, 'horario') && (<><dt>Horario</dt><dd>{texto(contenido, 'horario')}</dd></>)}
        </dl>
        {mapa && <a className="b-boton" href={mapa}>Ver en el mapa</a>}
      </section>
    )
  },
}
