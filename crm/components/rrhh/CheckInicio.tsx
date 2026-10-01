'use client'

import { createClient } from '@/lib/supabase/client'
import { cn, errorLegible, formatDia } from '@/lib/utils'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import type { TareaInicio } from '@/types'
import Icono from '@/components/ui/Icono'
import BarraProgreso from '@/components/ui/BarraProgreso'

/** Tareas del primer día de un trabajador. Solo un administrador puede marcarlas. */
export default function CheckInicio({ tareas, onCambio }: { tareas: TareaInicio[]; onCambio: () => void }) {
  const { empleado, esAdmin } = useSesion()
  const { aviso } = useAviso()
  const ordenadas = [...tareas].sort((a, b) => a.orden - b.orden)
  const hechas = tareas.filter((t) => t.completada).length

  async function marcar(t: TareaInicio) {
    const completada = !t.completada
    const { error } = await createClient().from('tarea_inicio').update({
      completada, fecha_completada: completada ? new Date().toISOString() : null, id_completada_por_fk: completada ? empleado?.id_empleado ?? null : null,
    }).eq('id_tarea', t.id_tarea)
    if (error) return aviso(errorLegible(error), 'error')
    onCambio()
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <BarraProgreso hechas={hechas} total={tareas.length} />
        {!esAdmin && <span className="text-[12px] text-texto-3">Las marca un administrador</span>}
      </div>
      <ul className="divide-y divide-borde-suave rounded-lg border border-borde">
        {ordenadas.map((t) => (
          <li key={t.id_tarea}>
            <button type="button" disabled={!esAdmin} onClick={() => marcar(t)}
              className={cn('flex w-full items-center gap-3 px-4 py-3 text-left', esAdmin && 'hover:bg-hover')}>
              <span className={cn('inline-flex size-5 shrink-0 items-center justify-center rounded-md border', t.completada ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-borde')}>
                {t.completada && <Icono nombre="check" tamano={12} grosor={3} />}
              </span>
              <span className={cn('flex-1 text-[13.5px]', t.completada ? 'text-texto-3 line-through' : 'text-texto')}>{t.descripcion}</span>
              {t.fecha_completada && <span className="text-[12px] text-texto-3">{formatDia(t.fecha_completada)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
