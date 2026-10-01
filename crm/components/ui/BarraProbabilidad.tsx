import { cn } from '@/lib/utils'

const SEGMENTOS = 12

// Cada segmento tiene su color según su posición: rojo (mal) → amarillo (en proceso) → verde (bien)
function colorSegmento(i: number, total: number) {
  const p = i / total
  if (p < 0.34) return 'bg-rose-500'
  if (p < 0.67) return 'bg-amber-400'
  return 'bg-emerald-500'
}

/** Barra segmentada de probabilidad, como la columna "Win Probability" de la plantilla */
export default function BarraProbabilidad({
  valor,
  segmentos = SEGMENTOS,
  mostrarValor = true,
  grande,
  className,
}: {
  valor: number
  segmentos?: number
  mostrarValor?: boolean
  grande?: boolean
  className?: string
}) {
  const llenos = Math.round((Math.max(0, Math.min(100, valor)) / 100) * segmentos)
  return (
    <div className={cn('flex items-center gap-2.5', className)} title={`${valor} %`}>
      <div className={cn('flex gap-[2px]', grande ? 'h-3' : 'h-3.5')}>
        {Array.from({ length: segmentos }, (_, i) => (
          <span
            key={i}
            className={cn('rounded-[1px]', grande ? 'w-[7px]' : 'w-[3.5px]', i < llenos ? colorSegmento(i, segmentos) : 'bg-segmento')}
          />
        ))}
      </div>
      {mostrarValor && <span className="w-9 text-right tabular-nums text-texto">{valor}%</span>}
    </div>
  )
}
