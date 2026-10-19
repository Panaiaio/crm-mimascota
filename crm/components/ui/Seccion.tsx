import Link from 'next/link'
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
        <div className="flex min-h-12 items-center justify-between gap-4 border-b border-borde px-6 py-2">
          {titulo && <h2 className="text-[14px] font-semibold text-texto">{titulo}</h2>}
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </div>
      )}
      <div className={sinPadding ? '' : 'p-6'}>{children}</div>
    </section>
  )
}

/** Una fila "Etiqueta: valor" de una ficha */
export function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    // Si la columna es estrecha, el valor pasa debajo de la etiqueta en vez de salirse por la derecha
    <div className="flex flex-wrap gap-x-4 py-2 text-[13.5px]">
      <dt className="w-[120px] shrink-0 text-texto-3">{etiqueta}</dt>
      <dd className="min-w-[min(100%,140px)] flex-1 break-words text-texto">{children ?? '—'}</dd>
    </div>
  )
}

/** Tarjeta de número grande (KPI) */
/**
 * Indicador del panel: cifra grande, comparación con el periodo anterior (▲ / ▼) y, si se le da "href",
 * lleva a la acción ("Revisar →").
 */
export function Cifra({ etiqueta, valor, detalle, tono, comparacion, href, accion }: {
  etiqueta: string
  valor: ReactNode
  detalle?: ReactNode
  tono?: 'verde' | 'amarillo' | 'rojo'
  /** diferencia con el periodo anterior; "mejorSiSube" dice si subir es bueno */
  comparacion?: { diferencia: number; texto: string; unidad?: string; mejorSiSube?: boolean }
  href?: string
  accion?: string
}) {
  const color = tono === 'verde' ? 'text-emerald-700 dark:text-emerald-400' : tono === 'amarillo' ? 'text-amber-700 dark:text-amber-400' : tono === 'rojo' ? 'text-rose-700 dark:text-rose-400' : 'text-texto'
  const c = comparacion
  const bueno = c && c.diferencia !== 0 ? (c.diferencia > 0) === (c.mejorSiSube ?? true) : null
  const contenido = (
    <>
      <p className="text-[13px] text-texto-3">{etiqueta}</p>
      <p className={cn('mt-2 text-[24px] font-semibold tracking-tight tabular-nums', color)}>{valor}</p>
      {c && (
        <p className={cn('mt-2 text-[13px] tabular-nums', bueno === null ? 'text-texto-3' : bueno ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>
          {c.diferencia > 0 ? '▲' : c.diferencia < 0 ? '▼' : '='} {c.diferencia === 0 ? 'Igual' : `${Math.abs(c.diferencia)}${c.unidad ?? ''}`} <span className="text-texto-3">{c.texto}</span>
        </p>
      )}
      {detalle && <p className="mt-2 text-[13px] text-texto-3">{detalle}</p>}
      {href && accion && <p className="mt-2 text-[13px] font-medium text-texto">{accion} →</p>}
    </>
  )
  return href
    ? <Link href={href} className="tarjeta block px-6 py-4 transition-colors hover:bg-hover">{contenido}</Link>
    : <div className="tarjeta px-6 py-4">{contenido}</div>
}
