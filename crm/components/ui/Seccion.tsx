import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Tarjeta con título para las fichas */
export default function Seccion({
  titulo,
  acciones,
  children,
  className,
  sinPadding,
}: {
  titulo?: string
  acciones?: ReactNode
  children: ReactNode
  className?: string
  sinPadding?: boolean
}) {
  return (
    <section className={cn('tarjeta min-w-0', className)}>
      {(titulo || acciones) && (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-borde px-5 py-2">
          {titulo && <h2 className="text-[14px] font-semibold text-texto">{titulo}</h2>}
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </div>
      )}
      <div className={sinPadding ? '' : 'p-5'}>{children}</div>
    </section>
  )
}

/** Una fila "Etiqueta: valor" de una ficha */
export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 text-[13.5px]">
      <dt className="text-texto-3">{etiqueta}</dt>
      <dd className="min-w-0 break-words text-texto">{children ?? '—'}</dd>
    </div>
  )
}

/** Tarjeta de número grande (KPI) */
export function Cifra({ etiqueta, valor, detalle, tono }: { etiqueta: string; valor: ReactNode; detalle?: ReactNode; tono?: 'verde' | 'amarillo' | 'rojo' }) {
  const color = tono === 'verde' ? 'text-emerald-600 dark:text-emerald-400' : tono === 'amarillo' ? 'text-amber-600 dark:text-amber-400' : tono === 'rojo' ? 'text-rose-600 dark:text-rose-400' : 'text-texto'
  return (
    <div className="tarjeta px-5 py-4">
      <p className="text-[12.5px] text-texto-3">{etiqueta}</p>
      <p className={cn('mt-1.5 text-[24px] font-semibold tracking-tight tabular-nums', color)}>{valor}</p>
      {detalle && <p className="mt-0.5 text-[12.5px] text-texto-3">{detalle}</p>}
    </div>
  )
}
