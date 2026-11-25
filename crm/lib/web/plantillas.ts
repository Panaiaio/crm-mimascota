import type { PlantillaId, TipoBloque } from './tipos'

type Plantilla = {
  nombre: string
  descripcion: string
  paleta: string // id from PALETAS
  fuente: string // CSS font-family stack, system fonts only
  bloques: { tipo: TipoBloque; contenido: Record<string, unknown> }[]
}

const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const SERIF = 'Georgia, "Times New Roman", Times, serif'

export const PLANTILLAS: Record<PlantillaId, Plantilla> = {
  negocio: {
    nombre: 'Negocio local',
    descripcion: 'Presenta tu negocio, tus servicios, las opiniones de tus clientes y cómo encontrarte.',
    paleta: 'mar',
    fuente: SANS,
    bloques: [
      {
        tipo: 'cabecera',
        contenido: {
          titulo: 'Tu negocio de confianza en el barrio',
          subtitulo: 'Atención cercana, precios claros y más de diez años de experiencia.',
          boton: 'Llámanos',
          enlace: 'tel:910000000',
          imagen: '',
          alt: '',
        },
      },
      {
        tipo: 'servicios',
        contenido: {
          titulo: 'Qué hacemos',
          items: [
            { titulo: 'Asesoramiento personal', texto: 'Escuchamos lo que necesitas y te proponemos la mejor opción.' },
            { titulo: 'Servicio a domicilio', texto: 'Vamos donde nos necesites, sin coste adicional en la ciudad.' },
            { titulo: 'Mantenimiento', texto: 'Revisiones periódicas para que todo siga funcionando como el primer día.' },
          ],
        },
      },
      {
        tipo: 'texto',
        contenido: {
          titulo: 'Quiénes somos',
          texto: 'Somos un equipo pequeño que trabaja cada día para que te sientas bien atendido.\n\nCreemos en el trato directo, en explicar las cosas con claridad y en cumplir los plazos.',
        },
      },
      {
        tipo: 'testimonios',
        contenido: {
          titulo: 'Lo que dicen nuestros clientes',
          items: [
            { cita: 'Muy profesionales y siempre atentos. Lo recomiendo sin dudarlo.', autor: 'Marta G.' },
            { cita: 'Resolvieron mi problema el mismo día y a buen precio.', autor: 'Javier R.' },
          ],
        },
      },
      {
        tipo: 'contacto',
        contenido: {
          titulo: 'Contacto',
          direccion: 'Calle Mayor 12, 28013 Madrid',
          telefono: '910 000 000',
          email: 'info@minegocio.example',
          horario: 'De lunes a viernes, de 9:00 a 19:00\nSábados, de 10:00 a 14:00',
          mapa: '',
        },
      },
    ],
  },
  portfolio: {
    nombre: 'Portfolio',
    descripcion: 'Enseña tus trabajos con una galería y cuéntale a la gente quién eres.',
    paleta: 'oscuro',
    fuente: SERIF,
    bloques: [
      {
        tipo: 'cabecera',
        contenido: {
          titulo: 'Diseño y fotografía con mirada propia',
          subtitulo: 'Una selección de proyectos recientes para marcas, revistas y personas.',
          boton: 'Escríbeme',
          enlace: 'mailto:hola@portfolio.example',
          imagen: '',
          alt: '',
        },
      },
      { tipo: 'galeria', contenido: { titulo: 'Trabajos seleccionados', items: [] } },
      {
        tipo: 'texto',
        contenido: {
          titulo: 'Sobre mí',
          texto: 'Trabajo como profesional independiente desde hace ocho años.\n\nMe gusta colaborar de cerca con cada cliente para encontrar una idea sencilla y bien ejecutada.',
        },
      },
      {
        tipo: 'llamada',
        contenido: {
          titulo: '¿Tienes un proyecto en mente?',
          texto: 'Cuéntame de qué se trata y te respondo en un par de días.',
          boton: 'Escríbeme',
          enlace: 'mailto:hola@portfolio.example',
        },
      },
    ],
  },
  evento: {
    nombre: 'Evento',
    descripcion: 'Anuncia una jornada o un congreso con programa, ponentes y preguntas frecuentes.',
    paleta: 'lavanda',
    fuente: SANS,
    bloques: [
      {
        tipo: 'cabecera',
        contenido: {
          titulo: 'Jornadas de innovación 2027',
          subtitulo: 'Un día de charlas y talleres, el 18 de marzo en Valencia.',
          boton: 'Reservar plaza',
          enlace: 'mailto:info@jornadas.example',
          imagen: '',
          alt: '',
        },
      },
      {
        tipo: 'texto',
        contenido: {
          titulo: 'Programa',
          texto: '9:30 Recepción y café de bienvenida.\n\n10:00 Charla inaugural.\n\n12:00 Talleres en paralelo.\n\n16:00 Mesa redonda y clausura.',
        },
      },
      {
        tipo: 'equipo',
        contenido: {
          titulo: 'Ponentes',
          items: [
            { nombre: 'Lucía Fernández', cargo: 'Directora de producto', foto: '', alt: '' },
            { nombre: 'Andrés Molina', cargo: 'Ingeniero de software', foto: '', alt: '' },
            { nombre: 'Elena Ruiz', cargo: 'Investigadora', foto: '', alt: '' },
          ],
        },
      },
      {
        tipo: 'preguntas',
        contenido: {
          titulo: 'Preguntas frecuentes',
          items: [
            { pregunta: '¿La entrada tiene coste?', respuesta: 'La asistencia es gratuita, pero hay que reservar plaza con antelación.' },
            { pregunta: '¿Habrá comida?', respuesta: 'Habrá café por la mañana y un pequeño almuerzo incluido.' },
            { pregunta: '¿Se puede asistir en remoto?', respuesta: 'Las charlas se retransmitirán en directo; los talleres son solo presenciales.' },
          ],
        },
      },
      {
        tipo: 'contacto',
        contenido: {
          titulo: 'Dónde y cómo contactar',
          direccion: 'Centro de congresos, Avenida del Puerto 20, 46023 Valencia',
          telefono: '960 000 000',
          email: 'info@jornadas.example',
          horario: 'Puertas abiertas a las 9:00',
          mapa: '',
        },
      },
    ],
  },
  vacia: {
    nombre: 'Empezar desde cero',
    descripcion: 'Solo la barra superior y el pie. Añade tú los bloques que quieras.',
    paleta: 'claro',
    fuente: SANS,
    bloques: [],
  },
}
