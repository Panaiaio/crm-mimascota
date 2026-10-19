import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Icono from './Icono'

/**
 * Etiqueta (siempre visible, encima) + control + ayuda o error debajo.
 * Con "error" el campo se marca con borde rojo e icono, y el mensaje explica cómo arreglarlo.
 */
export default function Campo({
  etiqueta,
  obligatorio,
  ayuda,
  error,
  nombre,
  children,
  className,
}: {
  etiqueta: string
  obligatorio?: boolean
  ayuda?: ReactNode
  error?: string | null
  /** Identificador del campo (para enlazar desde el resumen de errores) */
  nombre?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)} data-error={error ? 'true' : undefined} id={nombre ? `campo-${nombre}` : undefined}>
      <span className="label">
        {etiqueta}
        {obligatorio && <span className="ml-2 text-rose-700 dark:text-rose-400" aria-hidden="true">*</span>}
        {obligatorio && <span className="sr-only"> (obligatorio)</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-2 flex items-start gap-2 text-[13px] text-rose-700 dark:text-rose-400">
          <Icono nombre="alerta" tamano={15} className="mt-px shrink-0" /> {error}
        </span>
      ) : ayuda ? (
        <span className="mt-2 block text-[12.5px] text-texto-3">{ayuda}</span>
      ) : null}
    </label>
  )
}

/** Mensaje general del formulario (errores que no son de un campo concreto, p. ej. sin conexión) */
export function ErrorForm({ mensaje }: { mensaje?: string | null }) {
  if (!mensaje) return null
  return (
    <p role="alert" className="mr-auto flex items-start gap-2 text-[13px] text-rose-700 dark:text-rose-400">
      <Icono nombre="alerta" tamano={15} className="mt-px shrink-0" /> {mensaje}
    </p>
  )
}

export type Errores = Record<string, string>

/** Texto para el pie cuando hay campos con error */
export const resumenErrores = (e: Errores) => {
  const n = Object.keys(e).length
  return n === 1 ? 'Revisa el campo marcado en rojo.' : `Revisa los ${n} campos marcados en rojo.`
}
