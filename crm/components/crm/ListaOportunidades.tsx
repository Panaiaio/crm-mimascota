'use client'

import Link from 'next/link'
import { estadoInfo, proximoPaso } from '@/lib/crm-utils'
import { cn, formatDia, formatEUR } from '@/lib/utils'
import type { Oportunidad } from '@/types'
import Etiqueta from '@/components/ui/Etiqueta'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'

/** Lista compacta de oportunidades para las fichas de clientes y animales */
export default function ListaOportunidades({ oportunidades, vacio = 'Sin oportunidades' }: { oportunidades: Oportunidad[]; vacio?: string }) {
  if (!oportunidades.length) return <Vacio icono="oportunidad" titulo={vacio} />
  const ordenadas = [...oportunidades].sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))
  return (
    <ul className="divide-y divide-borde-suave">
      {ordenadas.map((o) => {
        const est = estadoInfo(o.estado)
        const paso = proximoPaso(o)
        return (
          <li key={o.id_oportunidad}>
            <Link href={`/oportunidades/${o.id_oportunidad}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-hover">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-texto">{o.titulo}</p>
                <p className="truncate text-[12.5px] text-texto-3">
                  {formatDia(o.fecha_creacion)}{o.animal ? ` · ${o.animal.nombre}` : ''}{o.servicio ? ` · ${o.servicio}` : ''}
                </p>
              </div>
              {paso && (
                <span className={cn('flex items-center gap-1 text-[12.5px]', paso.vencido ? 'text-rose-700 dark:text-rose-400' : 'text-texto-2')}>
                  <Icono nombre={paso.tipo === 'cita' ? 'calendario' : 'reloj'} tamano={13} /> {paso.texto}
                </span>
              )}
              <span className="w-20 text-right tabular-nums">{formatEUR(o.valor)}</span>
              <Etiqueta tono={est.tono} className="w-24 justify-center">{est.texto}</Etiqueta>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
