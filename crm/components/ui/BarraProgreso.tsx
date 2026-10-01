import { cn } from '@/lib/utils'

/** Barra de progreso: verde cuando está completa, amarilla mientras está en proceso */
export default function BarraProgreso({ hechas, total, className }: { hechas: number; total: number; className?: string }) {
  const p = total ? Math.round((hechas / total) * 100) : 0
  const completa = total > 0 && hechas >= total
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-segmento">
        <div className={cn('h-full rounded-full transition-all', completa ? 'bg-emerald-500' : 'bg-amber-400')} style={{ width: `${p}%` }} />
      </div>
      <span className={cn('text-[12.5px] tabular-nums', completa ? 'text-emerald-600 dark:text-emerald-400' : 'text-texto-2')}>
        {completa ? 'Completado' : `${hechas}/${total}`}
      </span>
    </div>
  )
}
