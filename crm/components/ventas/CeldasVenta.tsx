import Link from 'next/link'
import type { Venta } from '@/types'
import { nombreCliente } from '@/lib/crm-utils'
import { codigoVenta, estadoVentaInfo, validezPasada } from '@/lib/ventas-utils'
import { formatDia, nombreCompleto } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'

/** Primera columna de presupuestos y pedidos: número (enlace a la ficha) y cliente debajo */
export function CeldaVenta({ v }: { v: Venta }) {
  const cliente = nombreCliente(v)
  return (
    <td className="max-w-0 min-w-[160px]">
      <Link href={`/ventas/presupuestos/${v.id_venta}`} onClick={(e) => e.stopPropagation()} className="inline-flex min-h-6 items-center font-medium text-texto tabular-nums hover:underline">
        {codigoVenta(v.numero)}
      </Link>
      <p className="flex max-w-[340px] items-center gap-2 text-[12.5px] text-texto-3">
        <Avatar nombre={cliente} foto={v.empresa?.logo} cuadrado={!!v.empresa} tamano="xs" />
        <span className="truncate">{cliente}</span>
      </p>
    </td>
  )
}

/** Estado de la venta y, debajo, el aviso amarillo si es un presupuesto abierto con la validez pasada */
export function EstadoVentaEtiquetas({ v }: { v: Pick<Venta, 'estado' | 'fecha_validez'> }) {
  const est = estadoVentaInfo(v.estado)
  return (
    <span className="flex flex-col items-start">
      <Etiqueta tono={est.tono} title={est.ayuda}>{est.texto}</Etiqueta>
      {validezPasada(v) && <Etiqueta tono="amarillo" title={`Válido hasta el ${formatDia(v.fecha_validez)}`}>Validez pasada</Etiqueta>}
    </span>
  )
}

/** Comercial responsable con su foto, o "Sin asignar" */
export function Comercial({ v }: { v: Venta }) {
  return v.responsable ? (
    <span className="flex items-center gap-2"><Avatar nombre={nombreCompleto(v.responsable)} foto={v.responsable.foto} /><span className="text-texto-2">{v.responsable.nombre}</span></span>
  ) : <span className="text-texto-3">Sin asignar</span>
}
