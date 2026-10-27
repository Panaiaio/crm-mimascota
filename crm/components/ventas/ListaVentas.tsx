import type { ReactNode } from 'react'

import Link from 'next/link'
import { codigoVenta } from '@/lib/ventas-utils'
import { formatDia, formatEUR } from '@/lib/utils'
import type { Venta } from '@/types'
import Vacio from '@/components/ui/Vacio'
import { EstadoVentaEtiquetas } from '@/components/ventas/CeldasVenta'

export type VentaBreve = Pick<Venta, 'id_venta' | 'numero' | 'estado' | 'total' | 'fecha' | 'fecha_validez'>

/** Columnas que necesita la lista (para el select de Supabase) */
export const SELECT_VENTA_BREVE = 'id_venta, numero, estado, total, fecha, fecha_validez'

/** Lista compacta de presupuestos y pedidos para las fichas (ya ordenada por quien la usa) */
export default function ListaVentas({ ventas, vacio = 'Sin presupuestos', texto = 'Aquí aparecerán sus presupuestos y pedidos.', accion }: {
  ventas: VentaBreve[]
  vacio?: string
  texto?: string
  accion?: ReactNode
}) {
  if (!ventas.length) return <Vacio icono="venta" titulo={vacio} texto={texto}>{accion}</Vacio>
  return (
    <ul className="divide-y divide-borde-suave">
      {ventas.map((v) => (
        <li key={v.id_venta}>
          <Link href={`/ventas/presupuestos/${v.id_venta}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4 hover:bg-hover">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-texto tabular-nums">{codigoVenta(v.numero)}</p>
              <p className="truncate text-[12.5px] text-texto-3 tabular-nums">{formatDia(v.fecha)}</p>
            </div>
            <EstadoVentaEtiquetas v={v} />
            <span className="w-24 text-right whitespace-nowrap tabular-nums">{formatEUR(v.total, 2)}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
