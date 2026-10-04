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

/**
 * Pipeline (Kanban): una columna por estado, todas a la vista sin desplazarse hacia los lados.
 * En pantallas grandes las 6 columnas reparten el ancho; en pequeñas pasan a la línea siguiente.
 * Se arrastran las tarjetas para cambiar de estado.
 */
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
    <div className="grid h-full min-h-0 grid-cols-1 content-start gap-3 overflow-y-auto px-4 pb-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-6 xl:content-stretch xl:overflow-hidden">
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
            className={cn('flex min-w-0 flex-col rounded-xl border bg-superficie-2 transition-colors xl:min-h-0', encima === e.id && arrastrando ? 'border-primario' : 'border-borde')}
          >
            <header className="px-3 pt-3 pb-2.5">
              <div className="flex items-center gap-2">
                <span className={cn('size-2 shrink-0 rounded-full', PUNTOS[e.tono])} />
                <h3 className="truncate text-[13px] font-medium text-texto">{e.texto}</h3>
                <span className="ml-auto text-[12px] text-texto-3 tabular-nums">{lista.length}</span>
              </div>
              <p className="mt-0.5 pl-4 text-[12px] text-texto-3 tabular-nums">{formatEUR(total)}</p>
            </header>
            <div className="min-h-0 flex-1 space-y-2 px-2 pb-2 xl:overflow-y-auto">
              {lista.map((o) => {
                const paso = proximoPaso(o)
                return (
                  <Link
                    key={o.id_oportunidad}
                    href={`/oportunidades/${o.id_oportunidad}`}
                    draggable
                    onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', o.id_oportunidad); setArrastrando(o.id_oportunidad) }}
                    onDragEnd={() => setArrastrando(null)}
                    className={cn('block min-w-0 rounded-lg border border-borde bg-superficie p-3 transition-shadow hover:shadow-[var(--sombra)]', arrastrando === o.id_oportunidad && 'opacity-50')}
                  >
                    <p className="text-[13px] leading-snug font-medium break-words text-texto">{o.titulo}</p>
                    <p className="mt-0.5 truncate text-[12.5px] text-texto-3">{nombreCliente(o)}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                      <span className="text-[13px] font-medium tabular-nums">{formatEUR(o.valor)}</span>
                      <BarraProbabilidad valor={o.probabilidad} segmentos={8} className="gap-1.5 [&>span]:w-auto" />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-borde-suave pt-2.5 text-[12px]">
                      {paso ? (
                        <span className={cn('flex min-w-0 items-center gap-1 truncate', paso.vencido ? 'text-rose-700 dark:text-rose-400' : 'text-texto-2')}>
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
