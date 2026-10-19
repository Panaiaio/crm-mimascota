import { cn } from '@/lib/utils'
import Icono from './Icono'

/**
 * Progreso de un formulario por pasos: "Paso 1 de 3" y el estado de cada paso (hecho / actual / pendiente).
 * Con onIr se puede volver a un paso anterior (o saltar a cualquiera al editar).
 */
export default function Pasos({ pasos, actual, hechos, onIr }: { pasos: string[]; actual: number; hechos: boolean[]; onIr?: (i: number) => void }) {
  return (
    <div className="border-b border-borde px-6 py-4">
      <p className="text-[12.5px] text-texto-3">Paso {actual + 1} de {pasos.length}</p>
      <ol className="mt-2 flex flex-wrap gap-2">
        {pasos.map((p, i) => {
          const hecho = hechos[i] && i !== actual
          const clic = onIr && i !== actual
          return (
            <li key={p}>
              <button type="button" disabled={!clic} onClick={() => onIr?.(i)} aria-current={i === actual ? 'step' : undefined}
                className={cn('flex h-11 items-center gap-2 rounded-lg border px-4 text-[13.5px] transition-colors',
                  i === actual ? 'border-texto bg-texto font-medium text-fondo' : hecho ? 'border-borde text-texto hover:bg-hover' : 'border-borde text-texto-3',
                  clic && 'cursor-pointer', !clic && i !== actual && 'cursor-default')}>
                <span className={cn('inline-flex size-5 items-center justify-center rounded-full border text-[11px]',
                  i === actual ? 'border-fondo/50' : hecho ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-texto-3')}>
                  {hecho ? <Icono nombre="check" tamano={11} grosor={3} /> : i + 1}
                </span>
                {p}
                <span className="sr-only">{i === actual ? '(paso actual)' : hecho ? '(hecho)' : '(pendiente)'}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
