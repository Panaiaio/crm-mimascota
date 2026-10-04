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
      className={cn(
        'inline-flex size-4 items-center justify-center rounded-[4px] border transition-colors',
        marcada || parcial ? 'border-texto bg-texto text-fondo' : 'border-borde bg-superficie hover:border-texto-3',
      )}
    >
      {marcada && <Icono nombre="check" tamano={11} grosor={3} />}
      {!marcada && parcial && <span className="h-[2px] w-2 rounded bg-fondo" />}
    </button>
  )
}
