import type { ReactNode } from 'react'
import type { Tono } from '@/types'
import { cn } from '@/lib/utils'
import Icono, { type NombreIcono } from './Icono'

// Sin recuadro: gris = normal (apagado) · verde = bien · amarillo = aviso · rojo = error
// Con recuadro solo morado, para destacar (p. ej. "Admin")
export const TONOS: Record<Tono, string> = {
  gris: 'border-transparent bg-transparent !px-0 font-normal text-texto-3',
  verde: 'border-transparent bg-transparent !px-0 text-emerald-700 dark:text-emerald-400',
  amarillo: 'border-transparent bg-transparent !px-0 text-amber-700 dark:text-amber-400',
  rojo: 'border-transparent bg-transparent !px-0 text-rose-700 dark:text-rose-400',
  morado: 'border-violet-500/35 bg-violet-500/12 text-violet-700 dark:text-violet-300',
}

// El color nunca va solo: verde, amarillo y rojo llevan además un icono (se entiende impreso en blanco y negro)
const ICONOS: Partial<Record<Tono, NombreIcono>> = { verde: 'check', amarillo: 'reloj', rojo: 'alerta' }

export const PUNTOS: Record<Tono, string> = {
  gris: 'bg-zinc-400 dark:bg-zinc-500', verde: 'bg-emerald-500', amarillo: 'bg-amber-400', rojo: 'bg-rose-500', morado: 'bg-violet-500',
}

/** Etiqueta de color (sector, estado, tipo…). Con "punto" es un punto de color y el texto en gris, sin recuadro. */
export default function Etiqueta({
  tono = 'gris',
  punto,
  children,
  className,
  title,
}: {
  tono?: Tono
  punto?: boolean
  children: ReactNode
  className?: string
  title?: string
}) {
  if (punto) {
    return (
      <span title={title} className={cn('inline-flex h-6 items-center gap-2 text-[12.5px] whitespace-nowrap text-texto-3', className)}>
        <span className={cn('size-1.5 rounded-full', PUNTOS[tono])} />
        {children}
      </span>
    )
  }
  return (
    <span title={title} className={cn('inline-flex h-6 items-center gap-2 rounded-md border px-2 text-[12.5px] font-medium whitespace-nowrap', TONOS[tono], className)}>
      {ICONOS[tono] && <Icono nombre={ICONOS[tono]!} tamano={13} grosor={2.25} className="shrink-0" />}
      {children}
    </span>
  )
}

/** "+2" cuando hay más etiquetas de las que caben */
export function EtiquetaMas({ n, title }: { n: number; title?: string }) {
  if (n <= 0) return null
  return (
    <span title={title} className="inline-flex h-6 items-center text-[12px] text-texto-3">
      +{n}
    </span>
  )
}
