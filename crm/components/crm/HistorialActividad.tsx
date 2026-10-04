'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { tipoActividadTexto } from '@/lib/crm-utils'
import { cn, errorLegible, formatFechaHora, haceCuanto, nombreCompleto } from '@/lib/utils'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import type { Actividad, TipoActividad } from '@/types'
import Icono, { type NombreIcono } from '@/components/ui/Icono'
import Avatar from '@/components/ui/Avatar'
import Vacio from '@/components/ui/Vacio'

const ICONOS: Record<TipoActividad, NombreIcono> = {
  nota: 'nota', llamada: 'telefono', email: 'correo', cita: 'calendario', estado: 'oportunidad', sistema: 'info',
}

const COLOR_ICONO = 'border border-borde bg-superficie-2 text-texto-2'

/** Historial de una oportunidad (llamadas, emails, notas y cambios automáticos) con el cuadro para añadir */
export default function HistorialActividad({
  idOportunidad,
  actividades,
  onCambio,
}: {
  idOportunidad: string
  actividades: Actividad[]
  onCambio: () => void
}) {
  const { empleado, esAdmin } = useSesion()
  const { aviso } = useAviso()
  const [tipo, setTipo] = useState<TipoActividad>('llamada')
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function anadir(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    setGuardando(true)
    const { error } = await createClient().from('actividad').insert({
      id_oportunidad_fk: idOportunidad, tipo, descripcion: texto.trim(), id_empleado_fk: empleado?.id_empleado ?? null,
    })
    setGuardando(false)
    if (error) return aviso(errorLegible(error), 'error')
    setTexto('')
    onCambio()
  }

  async function borrar(a: Actividad) {
    const { error } = await createClient().from('actividad').delete().eq('id_actividad', a.id_actividad)
    if (error) return aviso(errorLegible(error), 'error')
    onCambio()
  }

  return (
    <div>
      <form onSubmit={anadir} className="border-b border-borde p-4">
        <div className="mb-2 flex gap-1">
          {(['llamada', 'email', 'nota'] as TipoActividad[]).map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={cn('inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px]', tipo === t ? 'bg-activo font-medium text-texto' : 'text-texto-3 hover:bg-hover')}>
              <Icono nombre={ICONOS[t]} tamano={13} /> {tipoActividadTexto(t)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) anadir(e) }}
            rows={2}
            className="input flex-1 resize-none"
            placeholder={tipo === 'llamada' ? '¿Qué se habló en la llamada?' : tipo === 'email' ? '¿Qué se le envió?' : 'Escribe una nota…'}
          />
          <button type="submit" className="btn-primario self-end" disabled={guardando || !texto.trim()}>Añadir</button>
        </div>
      </form>

      {actividades.length === 0 ? (
        <Vacio icono="actividad" titulo="Sin actividad todavía" />
      ) : (
        <ol className="px-4 py-2">
          {actividades.map((a, i) => (
            <li key={a.id_actividad} className="group relative flex gap-3 py-3">
              {i < actividades.length - 1 && <span className="absolute top-11 bottom-0 left-[15px] w-px bg-borde" />}
              <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full', COLOR_ICONO)}>
                <Icono nombre={ICONOS[a.tipo]} tamano={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-texto-3">
                  <span className="font-medium text-texto-2">{tipoActividadTexto(a.tipo)}</span>
                  {a.empleado && (
                    <span className="flex items-center gap-1.5">
                      · <Avatar nombre={nombreCompleto(a.empleado)} foto={a.empleado.foto} tamano="xs" /> {nombreCompleto(a.empleado)}
                    </span>
                  )}
                  <span title={formatFechaHora(a.fecha)}>· {haceCuanto(a.fecha)}</span>
                </div>
                <p className="mt-0.5 text-[13.5px] whitespace-pre-line text-texto">{a.descripcion}</p>
              </div>
              {['nota', 'llamada', 'email'].includes(a.tipo) && (esAdmin || a.id_empleado_fk === empleado?.id_empleado) && (
                <button type="button" onClick={() => borrar(a)} title="Borrar" aria-label="Borrar"
                  className="h-7 rounded-md px-1.5 text-texto-3 opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-rose-500 focus:opacity-100">
                  <Icono nombre="papelera" tamano={14} />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
