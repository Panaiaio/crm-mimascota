// Browser only: uses window and document. Call it from client components ('use client').
import { createClient } from '@/lib/supabase/client'
import { codigoVenta, SELECT_VENTA } from '@/lib/ventas-utils'
import { errorLegible } from '@/lib/utils'
import type { useAviso } from '@/hooks/useAviso'
import type { Venta } from '@/types'
import type { DatosClientePdf } from '@/components/ventas/PdfVenta'

/** Builds the PDF of a quote or sales order and downloads it (presupuesto-V-0012.pdf / pedido-V-0012.pdf) */
export async function descargarPdfVenta(idVenta: string): Promise<void> {
  const sb = createClient()
  const { data, error } = await sb.from('venta').select(`${SELECT_VENTA}, linea_venta(*)`).eq('id_venta', idVenta)
    .order('orden', { referencedTable: 'linea_venta' }).single()
  if (error) throw error
  const venta = data as Venta

  // SELECT_VENTA has no tax id, address or city of the customer
  let cliente: DatosClientePdf = {}
  if (venta.id_empresa_fk) {
    const r = await sb.from('empresa').select('cif, direccion, ciudad, telefono, correo').eq('id_empresa', venta.id_empresa_fk).single()
    if (r.error) throw r.error
    cliente = r.data
  } else if (venta.id_particular_fk) {
    const r = await sb.from('particular').select('ciudad').eq('id_particular', venta.id_particular_fk).single()
    if (r.error) throw r.error
    cliente = { telefono: venta.particular?.telefono, correo: venta.particular?.correo, ciudad: r.data.ciudad }
  }

  // Loaded on demand so @react-pdf/renderer stays out of the initial bundle
  const [{ pdf }, { default: PdfVenta }] = await Promise.all([import('@react-pdf/renderer'), import('@/components/ventas/PdfVenta')])
  const blob = await pdf(
    <PdfVenta venta={venta} lineas={venta.linea_venta ?? []} cliente={cliente} logoSrc={`${window.location.origin}/logo.png`} />,
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${venta.estado === 'pedido' ? 'pedido' : 'presupuesto'}-${codigoVenta(venta.numero)}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoked on the next tick so every browser has started the download
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Downloads the PDF and tells the user how it went */
export async function descargarPdfConAviso(v: Pick<Venta, 'id_venta' | 'numero'>, aviso: ReturnType<typeof useAviso>['aviso']) {
  try {
    await descargarPdfVenta(v.id_venta)
    aviso(`PDF de ${codigoVenta(v.numero)} descargado`)
  } catch (err) {
    aviso(errorLegible(err), 'error')
  }
}
