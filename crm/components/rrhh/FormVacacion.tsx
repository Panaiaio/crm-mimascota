'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { diasLaborables } from '@/lib/rrhh-utils'
import { errorLegible, hoyISO, nombreCompleto, sumarDias } from '@/lib/utils'
import { useSesion } from '@/hooks/useSesion'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useAviso } from '@/hooks/useAviso'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm } from '@/components/ui/Campo'

/** Pedir vacaciones (el administrador también puede apuntarlas a otra persona) */
export default function FormVacacion({
  abierto,
  onCerrar,
  disponibles,
  onGuardada,
}: {
  abierto: boolean
  onCerrar: () => void
  disponibles?: number
  onGuardada: () => void
}) {
  const { empleado, esAdmin } = useSesion()
  const { empleados } = useCatalogos()
  const { aviso } = useAviso()
  const [para, setPara] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setPara(empleado?.id_empleado ?? '')
    setInicio(sumarDias(hoyISO(), 7))
    setFin(sumarDias(hoyISO(), 11))
    setMotivo('')
    setError(null)
  }, [abierto, empleado])

  const dias = diasLaborables(inicio, fin)
  const propias = para === empleado?.id_empleado

  async function guardar() {
    if (!inicio || !fin) return setError('Elige las fechas')
    if (fin < inicio) return setError('La fecha de fin es anterior a la de inicio')
    if (!dias) return setError('Esas fechas no incluyen ningún día laborable')
    setGuardando(true)
    setError(null)
    const { error: err } = await createClient().from('vacacion').insert({ id_empleado_fk: para, fecha_inicio: inicio, fecha_fin: fin, motivo: motivo.trim() || null })
    setGuardando(false)
    if (err) return setError(errorLegible(err))
    aviso(propias ? 'Solicitud enviada. Un administrador la revisará.' : 'Vacaciones apuntadas')
    onGuardada()
    onCerrar()
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Pedir vacaciones" subtitulo="Un administrador la aprobará o la rechazará." ancho="sm" onSubmit={guardar}
      pie={<><ErrorForm mensaje={error} /><button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button><button type="submit" className="btn-primario" disabled={guardando}>{guardando ? 'Enviando…' : 'Enviar solicitud'}</button></>}>
      <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
        {esAdmin && (
          <Campo etiqueta="Para" className="sm:col-span-2">
            <select className="input" value={para} onChange={(e) => setPara(e.target.value)}>
              {empleados.map((e) => <option key={e.id_empleado} value={e.id_empleado}>{nombreCompleto(e)}{e.id_empleado === empleado?.id_empleado ? ' (yo)' : ''}</option>)}
            </select>
          </Campo>
        )}
        <Campo etiqueta="Desde"><input className="input" type="date" value={inicio} min={hoyISO()} onChange={(e) => { setInicio(e.target.value); if (e.target.value > fin) setFin(e.target.value) }} /></Campo>
        <Campo etiqueta="Hasta (incluido)"><input className="input" type="date" value={fin} min={inicio} onChange={(e) => setFin(e.target.value)} /></Campo>
        <Campo etiqueta="Motivo (opcional)" className="sm:col-span-2"><input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Vacaciones de verano" /></Campo>
        <div className="rounded-lg border border-borde bg-superficie-2 px-4 py-3 text-[13px] sm:col-span-2">
          <b className="text-[15px] tabular-nums">{dias}</b> {dias === 1 ? 'día laborable' : 'días laborables'}
          {propias && disponibles != null && (
            <span className={dias > disponibles ? 'text-rose-600 dark:text-rose-400' : 'text-texto-3'}>
              {' '}· te quedan {disponibles} {dias > disponibles ? '(no tienes suficientes)' : ''}
            </span>
          )}
        </div>
      </div>
    </Modal>
  )
}
