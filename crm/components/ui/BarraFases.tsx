import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Icono from './Icono'

export interface Fase<T extends string = string> {
  id: T
  texto: string
  /** Se muestra al pasar el ratón por la fase actual */
  ayuda?: string
}

// Clases completas para que Tailwind las encuentre (no se pueden montar con el número)
const COLUMNAS: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5', 6: 'sm:grid-cols-6' }

/**
 * Barra de fases de un proceso (oportunidad, venta…): las fases hechas con un check verde,
 * la actual en negro y las siguientes en gris. Con "alPulsar" cada fase es un botón para moverse a ella.
 * Con "perdida" (descartada, cancelada…) se muestra en su lugar un aviso en rojo.
 */
export default function BarraFases<T extends string>({
  fases,
  actual,
  alPulsar,
  sinMarcar = [],
  perdida,
  etiqueta = 'Fases',
}: {
  fases: Fase<T>[]
  actual: T
  alPulsar?: (id: T) => void
  /** Fases anteriores a la actual que no se hicieron (salen sin el check) */
  sinMarcar?: T[]
  /** Estado final perdido: texto en rojo y, si se quiere, un botón para recuperarlo */
  perdida?: { texto: string; accion?: ReactNode }
  /** Nombre de la lista para el lector de pantalla */
  etiqueta?: string
}) {
  if (perdida) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-borde bg-superficie-2 px-4 py-4">
        <Icono nombre="cerrar" className="text-rose-700 dark:text-rose-400" />
        <p className="flex-1 text-[13.5px] font-medium text-rose-700 dark:text-rose-400">{perdida.texto}</p>
        {perdida.accion}
      </div>
    )
  }

  const indice = fases.findIndex((f) => f.id === actual)
  return (
    <ol aria-label={etiqueta} className={cn('grid min-w-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border border-borde', COLUMNAS[fases.length])}>
      {fases.map((f, i) => {
        const hecho = i < indice && !sinMarcar.includes(f.id)
        const esActual = i === indice
        const clases = cn(
          'flex h-11 w-full items-center gap-2 px-4 text-left text-[13px] transition-colors',
          esActual ? 'bg-texto font-medium text-fondo' : alPulsar && 'hover:bg-hover',
          hecho ? 'text-texto' : !esActual && 'text-texto-3',
        )
        const contenido = (
          <>
            <span className={cn(
              'inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]',
              esActual ? 'border-fondo/40' : hecho ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-borde',
            )}>
              {hecho ? <Icono nombre="check" tamano={11} grosor={3} /> : i + 1}
            </span>
            <span className="truncate">{f.texto}</span>
            <span className="sr-only">{esActual ? '(fase actual)' : hecho ? '(hecha)' : '(pendiente)'}</span>
          </>
        )
        return (
          <li key={f.id} aria-current={esActual ? 'step' : undefined} className="min-w-0 border-b border-borde last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0">
            {alPulsar ? (
              <button type="button" onClick={() => !esActual && alPulsar(f.id)} title={esActual ? f.ayuda : `Mover a ${f.texto}`} className={clases}>
                {contenido}
              </button>
            ) : (
              <div title={f.ayuda} className={clases}>{contenido}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
