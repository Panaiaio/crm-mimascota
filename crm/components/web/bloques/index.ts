import type { DefBloque, TipoBloque } from '@/lib/web/tipos'
import { cabecera } from './cabecera'
import { bloqueTexto } from './texto'
import { servicios } from './servicios'
import { galeria } from './galeria'
import { equipo } from './equipo'
import { testimonios } from './testimonios'
import { preguntas } from './preguntas'
import { llamada } from './llamada'
import { contacto } from './contacto'

export const BLOQUES: Record<TipoBloque, DefBloque> = {
  cabecera,
  texto: bloqueTexto,
  servicios,
  galeria,
  equipo,
  testimonios,
  preguntas,
  llamada,
  contacto,
}
