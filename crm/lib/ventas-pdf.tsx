// Browser only: uses window and document. Call it from client components ('use client').
import { createClient } from '@/lib/supabase/client'
import { codigoVenta, SELECT_VENTA } from '@/lib/ventas-utils'
import { errorLegible } from '@/lib/utils'
import type { useAviso } from '@/hooks/useAviso'
import type { Venta } from '@/types'
import type { DatosClientePdf } from '@/components/ventas/PdfVenta'

/** Private bucket where every confirmed order leaves its PDF (<id_venta>.pdf) for the invoice reader agent (agente/) */
export const BUCKET_PEDIDOS = 'pedidos'

/** Builds the PDF of a quote or sales order */
async function generarPdfVenta(idVenta: string): Promise<{ venta: Venta; blob: Blob }> {
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
  return { venta, blob }
}

/** Uploads the PDF of a confirmed order to the 'pedidos' bucket (replaces the previous one if it was confirmed again) */
async function subirPdfPedido(idVenta: string, blob: Blob) {
  const { error } = await createClient().storage.from(BUCKET_PEDIDOS)
    .upload(`${idVenta}.pdf`, blob, { contentType: 'application/pdf', upsert: true })
  if (error) throw error
}

/**
 * Only for orders (never quotes): builds the PDF and leaves it in the 'pedidos' bucket,
 * where the agent picks it up and saves its data as an issued invoice.
 */
export async function guardarPdfPedido(idVenta: string): Promise<void> {
  const { venta, blob } = await generarPdfVenta(idVenta)
  if (venta.estado !== 'pedido') return
  await subirPdfPedido(idVenta, blob)
}

/** Builds the PDF of a quote or sales order and downloads it (presupuesto-V-0012.pdf / pedido-V-0012.pdf) */
export async function descargarPdfVenta(idVenta: string): Promise<void> {
  const { venta, blob } = await generarPdfVenta(idVenta)

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${venta.estado === 'pedido' ? 'pedido' : 'presupuesto'}-${codigoVenta(venta.numero)}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoked on the next tick so every browser has started the download
  setTimeout(() => URL.revokeObjectURL(url), 0)

  // An order whose upload failed when it was confirmed gets a second chance here (it does not block the download)
  if (venta.estado === 'pedido') await subirPdfPedido(idVenta, blob).catch(() => {})
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
