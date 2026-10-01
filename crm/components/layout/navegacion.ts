import type { NombreIcono } from '@/components/ui/Icono'

export interface EnlaceNav {
  href: string
  texto: string
  icono: NombreIcono
  /** Clave del contador que se muestra a la derecha (lo calcula AppShell) */
  contador?: keyof Contadores
  soloAdmin?: boolean
}

export interface Contadores {
  oportunidades: number
  empresas: number
  particulares: number
  animales: number
  empleados: number
  vacacionesPendientes: number
  nominasSinFirmar: number
}

/** Menú del sidebar agrupado por secciones */
export const NAVEGACION: { grupo?: string; enlaces: EnlaceNav[] }[] = [
  { enlaces: [{ href: '/', texto: 'Inicio', icono: 'inicio' }] },
  {
    grupo: 'CRM',
    enlaces: [
      { href: '/oportunidades', texto: 'Oportunidades', icono: 'oportunidad', contador: 'oportunidades' },
      { href: '/empresas', texto: 'Empresas', icono: 'empresa', contador: 'empresas' },
      { href: '/particulares', texto: 'Particulares', icono: 'particular', contador: 'particulares' },
      { href: '/animales', texto: 'Animales', icono: 'animal', contador: 'animales' },
    ],
  },
  {
    grupo: 'Recursos humanos',
    enlaces: [
      { href: '/rrhh/empleados', texto: 'Empleados', icono: 'equipo', contador: 'empleados' },
      { href: '/rrhh/fichajes', texto: 'Fichajes', icono: 'reloj' },
      { href: '/rrhh/vacaciones', texto: 'Vacaciones', icono: 'vacaciones', contador: 'vacacionesPendientes' },
      { href: '/rrhh/seleccion', texto: 'Selección', icono: 'seleccion', soloAdmin: true },
      { href: '/rrhh/evaluaciones', texto: 'Evaluaciones', icono: 'estrella' },
      { href: '/rrhh/nominas', texto: 'Nóminas', icono: 'nomina', contador: 'nominasSinFirmar' },
    ],
  },
]

/** Título por defecto de cada ruta (si la página no pone el suyo) */
export function tituloPorRuta(ruta: string) {
  for (const g of NAVEGACION) {
    for (const e of g.enlaces) {
      if (e.href === ruta) return e.texto
    }
  }
  for (const g of NAVEGACION) {
    for (const e of g.enlaces) {
      if (e.href !== '/' && ruta.startsWith(e.href + '/')) return e.texto
    }
  }
  return ''
}

export const NOMBRE_EMPRESA = process.env.NEXT_PUBLIC_NOMBRE_EMPRESA || 'Mi Mascota'
