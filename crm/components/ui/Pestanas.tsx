'use client'

import { cn } from '@/lib/utils'

export interface Pestana {
  id: string
  texto: string
  contador?: number
}

/** Pestañas subrayadas, como "Companies · Deals · Forecast" de la plantilla */
export default function Pestanas({
  pestanas,
  activa,
  onCambiar,
  className,
}: {
  pestanas: Pestana[]
  activa: string
  onCambiar: (id: string) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex gap-5 overflow-x-auto border-b border-borde px-4 sm:px-6', className)}>
      {pestanas.map((p) => (
        <button
          key={p.id}
          role="tab"
          type="button"
          aria-selected={activa === p.id}
          onClick={() => onCambiar(p.id)}
          className={cn(
            'relative -mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-[13.5px] whitespace-nowrap transition-colors',
            activa === p.id ? 'border-texto font-medium text-texto' : 'border-transparent text-texto-3 hover:text-texto-2',
          )}
        >
          {p.texto}
          {p.contador != null && (
            <span className={cn('rounded px-1.5 text-[11.5px] tabular-nums', activa === p.id ? 'bg-activo text-texto' : 'bg-hover text-texto-3')}>
              {p.contador}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
