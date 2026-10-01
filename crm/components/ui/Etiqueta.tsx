import type { ReactNode } from 'react'
import type { Tono } from '@/types'
import { cn } from '@/lib/utils'

// verde = bien · amarillo/naranja = en proceso · rojo = mal
export const TONOS: Record<Tono, string> = {
  gris: 'border-zinc-500/25 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300',
  azul: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  verde: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amarillo: 'border-amber-500/35 bg-amber-400/15 text-amber-700 dark:text-amber-300',
  naranja: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  rojo: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  morado: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  rosa: 'border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300',
  cian: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
}

export const PUNTOS: Record<Tono, string> = {
  gris: 'bg-zinc-400', azul: 'bg-blue-500', verde: 'bg-emerald-500', amarillo: 'bg-amber-400',
  naranja: 'bg-orange-500', rojo: 'bg-rose-500', morado: 'bg-violet-500', rosa: 'bg-pink-500', cian: 'bg-cyan-500',
}

/** Etiqueta de color (sector, estado, tipo…). Con "punto" se pinta como el "● Active" de la plantilla. */
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
      <span title={title} className={cn('inline-flex h-6 items-center gap-1.5 rounded-md border border-borde bg-superficie px-2 text-[12.5px] whitespace-nowrap text-texto-2', className)}>
        <span className={cn('size-1.5 rounded-full', PUNTOS[tono])} />
        {children}
      </span>
    )
  }
  return (
    <span title={title} className={cn('inline-flex h-6 items-center rounded-md border px-2 text-[12.5px] font-medium whitespace-nowrap', TONOS[tono], className)}>
      {children}
    </span>
  )
}

/** "+2" cuando hay más etiquetas de las que caben */
export function EtiquetaMas({ n, title }: { n: number; title?: string }) {
  if (n <= 0) return null
  return (
    <span title={title} className="inline-flex h-6 items-center rounded-md border border-borde bg-superficie-2 px-1.5 text-[12px] text-texto-2">
      +{n}
    </span>
  )
}
