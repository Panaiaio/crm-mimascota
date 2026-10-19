import { cn } from '@/lib/utils'
import Icono from './Icono'

/** Casilla de selección de las tablas */
export default function Casilla({
  marcada,
  parcial,
  onChange,
  etiqueta,
}: {
  marcada: boolean
  parcial?: boolean
  onChange: (valor: boolean) => void
  etiqueta?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={parcial ? 'mixed' : marcada}
      aria-label={etiqueta ?? 'Seleccionar'}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!marcada)
      }}
      className="group/casilla -m-3 inline-flex size-11 items-center justify-center"
    >
      <span className={cn(
        'inline-flex size-5 items-center justify-center rounded-[4px] border transition-colors',
        marcada || parcial ? 'border-texto bg-texto text-fondo' : 'border-texto-3 bg-superficie group-hover/casilla:border-texto',
      )}>
        {marcada && <Icono nombre="check" tamano={12} grosor={3} />}
        {!marcada && parcial && <span className="h-[2px] w-2 rounded bg-fondo" />}
      </span>
    </button>
  )
}
