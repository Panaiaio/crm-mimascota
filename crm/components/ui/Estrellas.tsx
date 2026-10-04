'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import Icono from './Icono'

/** Nota del 1 al 5 (estrellas siempre amarillas). Con onChange se puede elegir; sin onChange solo se muestra. */
export default function Estrellas({
  nota,
  onChange,
  tamano = 15,
}: {
  nota: number
  onChange?: (nota: number) => void
  tamano?: number
}) {
  const [encima, setEncima] = useState(0)
  const visible = encima || nota
  const color = 'text-amber-400'
  return (
    <div className="inline-flex items-center gap-0.5" onMouseLeave={() => setEncima(0)} title={`${nota} de 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            aria-label={`${n} de 5`}
            onMouseEnter={() => setEncima(n)}
            onClick={() => onChange(n)}
            className={cn('p-0.5 transition-transform hover:scale-110', n <= visible ? color : 'text-segmento')}
          >
            <Icono nombre="estrella" tamano={tamano + 8} grosor={1.5} fill="currentColor" />
          </button>
        ) : (
          <Icono key={n} nombre="estrella" tamano={tamano} grosor={1.5} fill="currentColor" className={n <= visible ? color : 'text-segmento'} />
        ),
      )}
    </div>
  )
}
