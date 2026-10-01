import { textoTrimestre } from '@/lib/rrhh-utils'
import { formatDia, nombreCompleto } from '@/lib/utils'
import type { Evaluacion } from '@/types'
import Estrellas from '@/components/ui/Estrellas'
import Vacio from '@/components/ui/Vacio'

/** Evaluaciones trimestrales de un trabajador, de la más reciente a la más antigua */
export default function ListaEvaluaciones({ evaluaciones, onEditar }: { evaluaciones: Evaluacion[]; onEditar?: (e: Evaluacion) => void }) {
  if (!evaluaciones.length) return <Vacio icono="estrella" titulo="Sin evaluaciones todavía" />
  const ordenadas = [...evaluaciones].sort((a, b) => b.anio - a.anio || b.trimestre - a.trimestre)
  return (
    <ul className="divide-y divide-borde-suave">
      {ordenadas.map((e) => (
        <li key={e.id_evaluacion} className="flex gap-4 px-5 py-4">
          <span className="inline-flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-borde bg-superficie-2 text-[13px] font-semibold">
            {textoTrimestre(e.anio, e.trimestre).split(' ')[0]}
            <span className="ml-1 text-[11px] font-normal text-texto-3">{String(e.anio).slice(2)}</span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Estrellas nota={e.nota} />
              <span className="text-[12.5px] text-texto-3">
                {textoTrimestre(e.anio, e.trimestre)}{e.evaluador ? ` · por ${nombreCompleto(e.evaluador)}` : ''} · {formatDia(e.fecha_creacion)}
              </span>
            </div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-texto">{e.comentario}</p>
          </div>
          {onEditar && <button type="button" className="btn-fantasma h-7 self-start px-2" onClick={() => onEditar(e)}>Editar</button>}
        </li>
      ))}
    </ul>
  )
}
