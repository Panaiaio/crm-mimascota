'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { estadoVacacionInfo } from '@/lib/rrhh-utils'
import { errorLegible, formatDia, haceCuanto, nombreCompleto } from '@/lib/utils'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import type { Vacacion } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import Modal from '@/components/ui/Modal'
import Campo from '@/components/ui/Campo'
import Vacio from '@/components/ui/Vacio'
import Icono from '@/components/ui/Icono'

/** Solicitudes de vacaciones. El administrador las aprueba o rechaza; cada uno puede anular las suyas pendientes. */
export default function ListaVacaciones({ vacaciones, conEmpleado, onCambio }: { vacaciones: Vacacion[]; conEmpleado?: boolean; onCambio: () => void }) {
  const { empleado, esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [rechazando, setRechazando] = useState<Vacacion | null>(null)
  const [comentario, setComentario] = useState('')

  async function revisar(v: Vacacion, estado: 'aprobada' | 'rechazada', texto?: string) {
    const { error } = await createClient().from('vacacion').update({ estado, comentario_revision: texto?.trim() || null }).eq('id_vacacion', v.id_vacacion)
    if (error) return aviso(errorLegible(error), 'error')
    aviso(estado === 'aprobada' ? 'Vacaciones aprobadas' : 'Vacaciones rechazadas')
    onCambio()
  }

  async function anular(v: Vacacion) {
    if (!(await confirmar({ titulo: '¿Anular esta solicitud?', boton: 'Anular', peligro: true }))) return
    const { error } = await createClient().from('vacacion').delete().eq('id_vacacion', v.id_vacacion)
    if (error) return aviso(errorLegible(error), 'error')
    onCambio()
  }

  if (!vacaciones.length) return <Vacio icono="vacaciones" titulo="No hay solicitudes" />

  return (
    <>
      <ul className="divide-y divide-borde-suave">
        {vacaciones.map((v) => {
          const e = estadoVacacionInfo(v.estado)
          const propia = v.id_empleado_fk === empleado?.id_empleado
          return (
            <li key={v.id_vacacion} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
              {conEmpleado && v.empleado && (
                <span className="flex w-52 items-center gap-2.5">
                  <Avatar nombre={nombreCompleto(v.empleado)} foto={v.empleado.foto} tamano="md" />
                  <span className="truncate font-medium">{nombreCompleto(v.empleado)}</span>
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-texto">
                  {formatDia(v.fecha_inicio)} → {formatDia(v.fecha_fin)} <span className="font-normal text-texto-3">· {v.dias} {v.dias === 1 ? 'día' : 'días'}</span>
                </p>
                <p className="truncate text-[12.5px] text-texto-3">
                  {v.motivo ?? 'Sin motivo'} · pedidas {haceCuanto(v.fecha_solicitud)}
                  {v.revisor && ` · revisadas por ${v.revisor.nombre}`}
                </p>
                {v.comentario_revision && <p className="mt-1 text-[12.5px] text-texto-2">«{v.comentario_revision}»</p>}
              </div>
              <Etiqueta tono={e.tono}>{e.texto}</Etiqueta>
              <div className="flex gap-2">
                {esAdmin && v.estado === 'pendiente' && (
                  <>
                    <button type="button" className="btn-exito" onClick={() => revisar(v, 'aprobada')}><Icono nombre="check" tamano={14} /> Aprobar</button>
                    <button type="button" className="btn-peligro" onClick={() => { setComentario(''); setRechazando(v) }}>Rechazar</button>
                  </>
                )}
                {esAdmin && v.estado !== 'pendiente' && (
                  <button type="button" className="btn-fantasma" onClick={() => revisar(v, v.estado === 'aprobada' ? 'rechazada' : 'aprobada')}>
                    {v.estado === 'aprobada' ? 'Revocar' : 'Aprobar'}
                  </button>
                )}
                {!esAdmin && propia && v.estado === 'pendiente' && <button type="button" className="btn-fantasma" onClick={() => anular(v)}>Anular</button>}
              </div>
            </li>
          )
        })}
      </ul>
      <Modal abierto={!!rechazando} onCerrar={() => setRechazando(null)} titulo="Rechazar vacaciones" ancho="sm"
        subtitulo={rechazando ? `${rechazando.empleado ? nombreCompleto(rechazando.empleado) + ' · ' : ''}${formatDia(rechazando.fecha_inicio)} → ${formatDia(rechazando.fecha_fin)}` : ''}
        onSubmit={() => { if (rechazando) revisar(rechazando, 'rechazada', comentario); setRechazando(null) }}
        pie={<><button type="button" className="btn-secundario" onClick={() => setRechazando(null)}>Cancelar</button><button type="submit" className="btn-peligro">Rechazar</button></>}>
        <div className="px-6 py-5">
          <Campo etiqueta="Motivo (lo verá el trabajador)">
            <textarea className="input" rows={3} value={comentario} onChange={(e) => setComentario(e.target.value)} autoFocus placeholder="Esos días estamos cortos de personal…" />
          </Campo>
        </div>
      </Modal>
    </>
  )
}
