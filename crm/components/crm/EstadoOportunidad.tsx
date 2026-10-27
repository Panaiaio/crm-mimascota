'use client'

import { useState } from 'react'
import { ESTADOS, estadoInfo, MOTIVOS_DESCARTE } from '@/lib/crm-utils'
import type { Estado, Oportunidad } from '@/types'
import BarraFases from '@/components/ui/BarraFases'
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

  if (actual === 'descartado') {
    return (
      <BarraFases
        fases={PASOS}
        actual={actual}
        perdida={{
          texto: `Descartada${oportunidad.motivo_descarte ? `: ${oportunidad.motivo_descarte}` : ''}`,
          accion: <button type="button" className="btn-secundario" onClick={() => onCambiar('contactado')}>Reabrir</button>,
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <BarraFases
        fases={PASOS}
        actual={actual}
        alPulsar={(e) => onCambiar(e)}
        sinMarcar={pasoPorPresupuesto ? [] : ['presupuesto']}
        etiqueta="Fases de la oportunidad"
      />
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
