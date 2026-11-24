import type { Paleta } from './paletas'

export type TipoBloque =
  | 'cabecera'
  | 'texto'
  | 'servicios'
  | 'galeria'
  | 'equipo'
  | 'testimonios'
  | 'preguntas'
  | 'llamada'
  | 'contacto'

export type PlantillaId = 'negocio' | 'portfolio' | 'evento' | 'vacia'

export type RolWeb = 'dueno' | 'editor' | 'lector' | 'admin'

export interface Bloque {
  id_bloque: string
  id_web_fk: string
  tipo: TipoBloque
  orden: number
  contenido: Record<string, unknown>
}

export interface Ajustes {
  titulo: string
  logo: string | null
  pie: string
  descripcion: string
}

export interface Web {
  id_web: string
  nombre: string
  plantilla: PlantillaId
  paleta: Paleta
  ajustes: Ajustes
  id_dueno_fk: string
  creada: string
  actualizada: string
}

// `lista` = repeatable items (e.g. service cards) with `campos` per item.
export type CampoBloque = {
  clave: string
  etiqueta: string
  tipo: 'texto' | 'textoLargo' | 'imagen' | 'enlace' | 'lista'
  campos?: CampoBloque[]
  max?: number
  obligatorio?: boolean
}

// Editor: signed URL. Export: `imagenes/<file>`.
export type ResolverImagen = (ruta: string) => string

export interface DefBloque {
  tipo: TipoBloque
  nombre: string
  descripcion: string
  campos: CampoBloque[]
  porDefecto: Record<string, unknown>
  vacio(c: Record<string, unknown>): boolean
  Componente: (p: { contenido: Record<string, unknown>; imagen: ResolverImagen; id: string }) => React.JSX.Element
}
