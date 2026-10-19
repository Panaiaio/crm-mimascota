'use client'

import { useState } from 'react'
import { ESTADOS, estadoInfo, MOTIVOS_DESCARTE } from '@/lib/crm-utils'
import { cn } from '@/lib/utils'
import type { Estado, Oportunidad } from '@/types'
import Icono from '@/components/ui/Icono'
import Modal from '@/components/ui/Modal'
import Campo from '@/components/ui/Campo'

const PASOS = ESTADOS.filter((e) => e.id !== 'descartado')

/**
 * Barra de fases de una oportunidad: Nuevo → Contactado → Presupuesto → Cita → Atendido.
 * Se hace clic en una fase para mover la oportunidad; "Descartar" pide el motivo.
 */
export default function EstadoOportunidad({
  oportunidad,
  onCambiar,
  pasoPorPresupuesto = true,
}: {
  oportunidad: Oportunidad
  onCambiar: (estado: Estado, extra?: { motivo_descarte?: string }) => void
  /** false si llegó a cita o atendido sin pasar por presupuesto (ese paso sale sin marcar) */
  pasoPorPresupuesto?: boolean
}) {
  const [descartando, setDescartando] = useState(false)
  const [motivo, setMotivo] = useState(MOTIVOS_DESCARTE[0])
  const actual = oportunidad.estado
  const indice = PASOS.findIndex((p) => p.id === actual)

  if (actual === 'descartado') {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-borde bg-superficie-2 px-4 py-4">
        <Icono nombre="cerrar" className="text-rose-700 dark:text-rose-400" />
        <p className="flex-1 text-[13.5px] font-medium text-rose-700 dark:text-rose-400">
          Descartada{oportunidad.motivo_descarte ? `: ${oportunidad.motivo_descarte}` : ''}
        </p>
        <button type="button" className="btn-secundario" onClick={() => onCambiar('contactado')}>Reabrir</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <ol className="grid min-w-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border border-borde sm:grid-cols-5">
        {PASOS.map((p, i) => {
          const hecho = i < indice && !(p.id === 'presupuesto' && !pasoPorPresupuesto)
          const esActual = i === indice
          return (
            <li key={p.id} className="min-w-0 border-b border-borde last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0">
              <button
                type="button"
                onClick={() => !esActual && onCambiar(p.id)}
                title={esActual ? p.ayuda : `Mover a ${p.texto}`}
                className={cn(
                  'flex h-11 w-full items-center gap-2 px-4 text-left text-[13px] transition-colors',
                  esActual ? 'bg-texto font-medium text-fondo' : 'hover:bg-hover',
                  hecho ? 'text-texto' : !esActual && 'text-texto-3',
                )}
              >
                <span className={cn(
                  'inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]',
                  esActual ? 'border-fondo/40' : hecho ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-borde',
                )}>
                  {hecho ? <Icono nombre="check" tamano={11} grosor={3} /> : i + 1}
                </span>
                <span className="truncate">{p.texto}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <button type="button" className="btn-peligro h-11 px-4" onClick={() => setDescartando(true)}>Descartar</button>

      <Modal
        abierto={descartando}
        onCerrar={() => setDescartando(false)}
        titulo="Descartar oportunidad"
        subtitulo={`"${oportunidad.titulo}" pasará a ${estadoInfo('descartado').texto}.`}
        ancho="sm"
        onSubmit={() => { setDescartando(false); onCambiar('descartado', { motivo_descarte: motivo }) }}
        pie={
          <>
            <button type="button" className="btn-secundario" onClick={() => setDescartando(false)}>Cancelar</button>
            <button type="submit" className="btn-peligro">Descartar</button>
          </>
        }
      >
        <div className="px-6 py-6">
          <Campo etiqueta="Motivo">
            <select className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus>
              {MOTIVOS_DESCARTE.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Campo>
        </div>
      </Modal>
    </div>
  )
}
