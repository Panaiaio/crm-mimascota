'use client'

import { formatDuracion, minutosFichaje } from '@/lib/rrhh-utils'
import { aISO, cn, formatFechaLarga, formatHora, nombreCompleto } from '@/lib/utils'
import type { Fichaje } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Icono from '@/components/ui/Icono'
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
    <div className="@container">
      <table className="tabla">
        <thead>
          <tr>
            <th className="w-full @min-[1000px]:w-auto !pl-5">Día</th>
            {conEmpleado && <th className="hidden @min-[740px]:table-cell">Empleado</th>}
            <th>Entrada</th>
            <th>Salida</th>
            <th className="hidden text-right @min-[560px]:table-cell">Horas</th>
            {onEditar && <th className="w-16" />}
          </tr>
        </thead>
        <tbody>
          {[...dias.entries()].map(([dia, lista]) => {
            const total = lista.reduce((s, f) => s + minutosFichaje(f), 0)
            return lista.map((f, i) => (
              <tr key={f.id_fichaje}>
                <td className="max-w-0 @min-[1000px]:max-w-none min-w-[96px] truncate !pl-5">
                  {i === 0 ? (
                    <span className="inline-block first-letter:uppercase">{formatFechaLarga(dia)}{!conEmpleado && lista.length > 1 && <span className="ml-2 text-[12px] text-texto-3 normal-case">total {formatDuracion(total)}</span>}</span>
                  ) : null}
                </td>
                {conEmpleado && (
                  <td className="hidden @min-[740px]:table-cell">{f.empleado && <span className="flex items-center gap-2"><Avatar nombre={nombreCompleto(f.empleado)} foto={f.empleado.foto} />{nombreCompleto(f.empleado)}</span>}</td>
                )}
                <td className="tabular-nums">{formatHora(f.entrada)}</td>
                <td className="tabular-nums">{f.salida ? formatHora(f.salida) : <span className="text-emerald-600 dark:text-emerald-400">Trabajando</span>}</td>
                <td className={cn('hidden text-right tabular-nums @min-[560px]:table-cell', !f.salida && 'text-emerald-600 dark:text-emerald-400')}>{formatDuracion(minutosFichaje(f))}</td>
                {onEditar && <td className="text-right"><button type="button" onClick={() => onEditar(f)} className="btn-fantasma h-7 px-2" aria-label="Corregir"><Icono nombre="lapiz" tamano={13} /><span className="hidden @min-[480px]:inline">Corregir</span></button></td>}
              </tr>
            ))
          })}
        </tbody>
      </table>
    </div>
  )
}
