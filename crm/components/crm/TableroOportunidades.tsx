'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ESTADOS, nombreCliente, proximoPaso } from '@/lib/crm-utils'
import { cn, formatEUR, nombreCompleto } from '@/lib/utils'
import type { Estado, Oportunidad } from '@/types'
import Avatar from '@/components/ui/Avatar'
import BarraProbabilidad from '@/components/ui/BarraProbabilidad'
import Icono from '@/components/ui/Icono'
import { PUNTOS } from '@/components/ui/Etiqueta'

/** Tablero Kanban: una columna por estado. Se arrastran las tarjetas para cambiar de estado. */
export default function TableroOportunidades({
  oportunidades,
  onMover,
}: {
  oportunidades: Oportunidad[]
  onMover: (o: Oportunidad, estado: Estado) => void
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [encima, setEncima] = useState<Estado | null>(null)

  return (
    <div className="flex h-full min-h-0 gap-3 overflow-x-auto px-4 pb-4 sm:px-6">
      {ESTADOS.map((e) => {
        const lista = oportunidades.filter((o) => o.estado === e.id)
        const total = lista.reduce((s, o) => s + Number(o.valor), 0)
        return (
          <section
            key={e.id}
            onDragOver={(ev) => { ev.preventDefault(); setEncima(e.id) }}
            onDragLeave={() => setEncima((x) => (x === e.id ? null : x))}
            onDrop={(ev) => {
              ev.preventDefault()
              setEncima(null)
              const o = oportunidades.find((x) => x.id_oportunidad === ev.dataTransfer.getData('text/plain'))
              if (o && o.estado !== e.id) onMover(o, e.id)
            }}
            className={cn('flex w-[272px] shrink-0 flex-col rounded-xl border bg-superficie-2 transition-colors', encima === e.id && arrastrando ? 'border-primario' : 'border-borde')}
          >
            <header className="flex items-center gap-2 px-3 py-3">
              <span className={cn('size-2 rounded-full', PUNTOS[e.tono])} />
              <h3 className="text-[13px] font-medium text-texto">{e.texto}</h3>
              <span className="text-[12px] text-texto-3 tabular-nums">{lista.length}</span>
              <span className="ml-auto text-[12px] text-texto-3 tabular-nums">{formatEUR(total)}</span>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2">
              {lista.map((o) => {
                const paso = proximoPaso(o)
                return (
                  <Link
                    key={o.id_oportunidad}
                    href={`/oportunidades/${o.id_oportunidad}`}
                    draggable
                    onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', o.id_oportunidad); setArrastrando(o.id_oportunidad) }}
                    onDragEnd={() => setArrastrando(null)}
                    className={cn('block rounded-lg border border-borde bg-superficie p-3 transition-shadow hover:shadow-[var(--sombra)]', arrastrando === o.id_oportunidad && 'opacity-50')}
                  >
                    <p className="text-[13px] leading-snug font-medium text-texto">{o.titulo}</p>
                    <p className="mt-0.5 truncate text-[12.5px] text-texto-3">{nombreCliente(o)}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium tabular-nums">{formatEUR(o.valor)}</span>
                      <BarraProbabilidad valor={o.probabilidad} segmentos={8} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-borde-suave pt-2.5 text-[12px]">
                      {paso ? (
                        <span className={cn('flex items-center gap-1', paso.vencido ? 'text-rose-600 dark:text-rose-400' : 'text-texto-2')}>
                          <Icono nombre={paso.tipo === 'cita' ? 'calendario' : 'reloj'} tamano={12} /> {paso.texto}
                        </span>
                      ) : <span className="text-texto-3">{o.origen === 'web' ? 'Desde la web' : ''}</span>}
                      {o.responsable && <Avatar nombre={nombreCompleto(o.responsable)} foto={o.responsable.foto} tamano="xs" />}
                    </div>
                  </Link>
                )
              })}
              {!lista.length && <p className="px-2 py-6 text-center text-[12px] text-texto-3">Arrastra aquí</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
