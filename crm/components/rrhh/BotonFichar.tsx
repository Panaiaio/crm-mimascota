'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDuracion, lunesDeEstaSemana, minutosFichaje } from '@/lib/rrhh-utils'
import { cn, errorLegible, formatHora, hoyISO } from '@/lib/utils'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import type { Fichaje } from '@/types'
import Icono from '@/components/ui/Icono'

/** Tarjeta para fichar la entrada y la salida, con las horas de hoy y de la semana */
export default function BotonFichar({ onFichado, compacto }: { onFichado?: () => void; compacto?: boolean }) {
  const { empleado } = useSesion()
  const { aviso } = useAviso()
  const [fichajes, setFichajes] = useState<Fichaje[]>([])
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [, setTic] = useState(0)

  async function cargar() {
    if (!empleado) return
    const { data } = await createClient().from('fichaje').select('*').eq('id_empleado_fk', empleado.id_empleado)
      .gte('entrada', lunesDeEstaSemana()).order('entrada', { ascending: false })
    setFichajes((data ?? []) as Fichaje[])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [empleado]) // eslint-disable-line react-hooks/exhaustive-deps
  // Refresca el contador cada minuto
  useEffect(() => { const t = setInterval(() => setTic((x) => x + 1), 30_000); return () => clearInterval(t) }, [])

  if (!empleado) return null

  const abierto = fichajes.find((f) => !f.salida)
  const hoy = fichajes.filter((f) => f.entrada.slice(0, 10) === hoyISO() || new Date(f.entrada).toDateString() === new Date().toDateString())
  const minHoy = hoy.reduce((s, f) => s + minutosFichaje(f), 0)
  const minSemana = fichajes.reduce((s, f) => s + minutosFichaje(f), 0)

  async function fichar() {
    setEnviando(true)
    const { data, error } = await createClient().rpc('fichar')
    setEnviando(false)
    if (error) return aviso(errorLegible(error), 'error')
    const f = data as Fichaje
    aviso(f.salida ? `Salida fichada a las ${formatHora(f.salida)}` : `Entrada fichada a las ${formatHora(f.entrada)}`)
    await cargar()
    onFichado?.()
  }

  return (
    <div className={cn('tarjeta flex flex-col gap-4 p-5', !compacto && 'sm:flex-row sm:items-center')}>
      <div className="flex flex-1 items-center gap-3">
        <span className={cn('relative inline-flex size-11 items-center justify-center rounded-xl', abierto ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-hover text-texto-3')}>
          <Icono nombre="reloj" tamano={20} />
          {abierto && <span className="absolute -top-0.5 -right-0.5 size-3 animate-pulse rounded-full bg-emerald-500 ring-2 ring-superficie" />}
        </span>
        <div>
          <p className="text-[15px] font-semibold">{cargando ? '…' : abierto ? `Trabajando desde las ${formatHora(abierto.entrada)}` : 'Fuera de la jornada'}</p>
          <p className="text-[13px] text-texto-3">Hoy {formatDuracion(minHoy)} · Esta semana {formatDuracion(minSemana)}</p>
        </div>
      </div>
      <button type="button" onClick={fichar} disabled={enviando || cargando}
        className="btn-primario h-10 px-5 text-[14px]">
        <Icono nombre={abierto ? 'pausa' : 'play'} tamano={16} />
        {enviando ? 'Fichando…' : abierto ? 'Fichar salida' : 'Fichar entrada'}
      </button>
    </div>
  )
}
