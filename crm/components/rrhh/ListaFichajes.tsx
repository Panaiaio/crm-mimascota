'use client'

import { formatDuracion, minutosFichaje } from '@/lib/rrhh-utils'
import { aISO, cn, formatFechaLarga, formatHora, nombreCompleto } from '@/lib/utils'
import type { Fichaje } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Vacio from '@/components/ui/Vacio'

/** Fichajes agrupados por día con el total de horas de cada día */
export default function ListaFichajes({ fichajes, conEmpleado, onEditar }: { fichajes: Fichaje[]; conEmpleado?: boolean; onEditar?: (f: Fichaje) => void }) {
  if (!fichajes.length) return <Vacio icono="reloj" titulo="Sin fichajes en este periodo" />
  const dias = new Map<string, Fichaje[]>()
  for (const f of [...fichajes].sort((a, b) => b.entrada.localeCompare(a.entrada))) {
    const d = aISO(new Date(f.entrada))
    dias.set(d, [...(dias.get(d) ?? []), f])
  }
  return (
    <div className="overflow-x-auto">
      <table className="tabla min-w-[560px]">
        <thead>
          <tr>
            <th className="!pl-5">Día</th>
            {conEmpleado && <th>Empleado</th>}
            <th>Entrada</th>
            <th>Salida</th>
            <th className="text-right">Horas</th>
            {onEditar && <th className="w-16" />}
          </tr>
        </thead>
        <tbody>
          {[...dias.entries()].map(([dia, lista]) => {
            const total = lista.reduce((s, f) => s + minutosFichaje(f), 0)
            return lista.map((f, i) => (
              <tr key={f.id_fichaje}>
                <td className="!pl-5">
                  {i === 0 ? (
                    <span className="inline-block first-letter:uppercase">{formatFechaLarga(dia)}{!conEmpleado && lista.length > 1 && <span className="ml-2 text-[12px] text-texto-3 normal-case">total {formatDuracion(total)}</span>}</span>
                  ) : null}
                </td>
                {conEmpleado && (
                  <td>{f.empleado && <span className="flex items-center gap-2"><Avatar nombre={nombreCompleto(f.empleado)} foto={f.empleado.foto} />{nombreCompleto(f.empleado)}</span>}</td>
                )}
                <td className="tabular-nums">{formatHora(f.entrada)}</td>
                <td className="tabular-nums">{f.salida ? formatHora(f.salida) : <span className="text-emerald-600 dark:text-emerald-400">Trabajando</span>}</td>
                <td className={cn('text-right tabular-nums', !f.salida && 'text-emerald-600 dark:text-emerald-400')}>{formatDuracion(minutosFichaje(f))}</td>
                {onEditar && <td className="text-right"><button type="button" onClick={() => onEditar(f)} className="btn-fantasma h-7 px-2">Corregir</button></td>}
              </tr>
            ))
          })}
        </tbody>
      </table>
    </div>
  )
}
