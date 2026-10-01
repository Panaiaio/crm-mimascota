'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { textoTrimestre } from '@/lib/rrhh-utils'
import { errorLegible, nombreCompleto } from '@/lib/utils'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import type { EmpleadoBreve, Evaluacion } from '@/types'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm } from '@/components/ui/Campo'
import Estrellas from '@/components/ui/Estrellas'
import Avatar from '@/components/ui/Avatar'

const TEXTOS = ['', 'Muy por debajo de lo esperado', 'Por debajo de lo esperado', 'Cumple lo esperado', 'Por encima de lo esperado', 'Excelente']

/** Evaluación trimestral de un trabajador: nota del 1 al 5 y comentario (solo administradores) */
export default function FormEvaluacion({
  abierto,
  onCerrar,
  empleado,
  anio,
  trimestre,
  evaluacion,
  onGuardada,
}: {
  abierto: boolean
  onCerrar: () => void
  empleado: EmpleadoBreve | null
  anio: number
  trimestre: number
  evaluacion?: Evaluacion | null
  onGuardada: () => void
}) {
  const { empleado: yo } = useSesion()
  const { aviso } = useAviso()
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setNota(evaluacion?.nota ?? 0)
    setComentario(evaluacion?.comentario ?? '')
    setError(null)
  }, [abierto, evaluacion])

  if (!empleado) return null

  async function guardar() {
    if (!empleado) return
    if (!nota) return setError('Elige una nota del 1 al 5')
    if (comentario.trim().length < 5) return setError('Escribe un comentario')
    setGuardando(true)
    const sb = createClient()
    const datos = { nota, comentario: comentario.trim(), id_evaluador_fk: yo?.id_empleado ?? null }
    const { error: err } = evaluacion
      ? await sb.from('evaluacion').update(datos).eq('id_evaluacion', evaluacion.id_evaluacion)
      : await sb.from('evaluacion').insert({ ...datos, id_empleado_fk: empleado.id_empleado, anio, trimestre })
    setGuardando(false)
    if (err) return setError(errorLegible(err))
    aviso('Evaluación guardada')
    onGuardada()
    onCerrar()
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={`Evaluación ${textoTrimestre(anio, trimestre)}`} ancho="sm" onSubmit={guardar}
      pie={<><ErrorForm mensaje={error} /><button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button><button type="submit" className="btn-primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar evaluación'}</button></>}>
      <div className="space-y-5 px-6 py-5">
        <div className="flex items-center gap-3">
          <Avatar nombre={nombreCompleto(empleado)} foto={empleado.foto} tamano="md" />
          <p className="font-medium">{nombreCompleto(empleado)}</p>
        </div>
        <div>
          <span className="label">Nota</span>
          <div className="flex items-center gap-3">
            <Estrellas nota={nota} onChange={setNota} tamano={18} />
            <span className="text-[13px] text-texto-2">{TEXTOS[nota]}</span>
          </div>
        </div>
        <Campo etiqueta="Comentario">
          <textarea className="input" rows={4} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Qué ha hecho bien, qué puede mejorar…" />
        </Campo>
      </div>
    </Modal>
  )
}
