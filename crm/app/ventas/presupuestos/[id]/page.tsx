'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { enlaceCliente, nombreCliente } from '@/lib/crm-utils'
import {
  codigoVenta, condicionPagoTexto, ESTADOS_VENTA, estadoVentaInfo, formatCantidad, puedePasarVenta, SELECT_VENTA,
  totalesVenta, validezPasada,
} from '@/lib/ventas-utils'
import { errorLegible, formatDia, formatEUR, formatFechaHora, nombreCompleto } from '@/lib/utils'
import { NOMBRE_EMPRESA } from '@/components/layout/navegacion'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { EstadoVenta, LineaVenta, Venta } from '@/types'
import CabeceraFicha, { CifrasFicha } from '@/components/ui/CabeceraFicha'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import BarraFases from '@/components/ui/BarraFases'
import Seccion, { Dato } from '@/components/ui/Seccion'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FichaCargando } from '@/components/ui/Cargando'
import LineasVenta from '@/components/ventas/LineasVenta'
import FormVenta from '@/components/ventas/FormVenta'

const FASES = ESTADOS_VENTA.filter((e) => e.id !== 'cancelado')

/** Enlace mailto: con el presupuesto en texto (líneas, totales y condiciones) */
function enlaceCorreo(v: Venta, lineas: LineaVenta[], correo: string) {
  const codigo = codigoVenta(v.numero)
  const cuerpo = [
    `Hola${v.particular ? `, ${v.particular.nombre}` : ''}:`,
    '',
    `Le enviamos el presupuesto ${codigo}, válido hasta el ${formatDia(v.fecha_validez)}.`,
    '',
    ...lineas.map((l) => `- ${l.descripcion}: ${formatCantidad(l.cantidad)} x ${formatEUR(l.precio_unitario, 2)}`
      + `${Number(l.descuento) ? ` (dto. ${formatCantidad(l.descuento)} %)` : ''} = ${formatEUR(l.subtotal, 2)} + IVA ${l.iva} %`),
    '',
    `Base imponible: ${formatEUR(v.base_imponible, 2)}`,
    ...totalesVenta(lineas).desglose.map((d) => `IVA ${d.tipo} %: ${formatEUR(d.iva, 2)}`),
    `Total: ${formatEUR(v.total, 2)}`,
    '',
    `Condiciones de pago: ${condicionPagoTexto(v.condiciones_pago)}`,
    '',
    'Para aceptarlo, basta con responder a este correo.',
    '',
    'Un saludo,',
    ...(v.responsable ? [nombreCompleto(v.responsable)] : []),
    NOMBRE_EMPRESA,
  ].join('\n')
  return `mailto:${correo}?subject=${encodeURIComponent(`Presupuesto ${codigo} · ${NOMBRE_EMPRESA}`)}&body=${encodeURIComponent(cuerpo)}`
}

/** Hasta dónde llegó una venta cancelada (las fechas de envío y confirmación se conservan al cancelar) */
function textoCancelada(v: Venta) {
  if (v.fecha_confirmacion) return `Cancelado después de confirmarse como pedido el ${formatDia(v.fecha_confirmacion)}. Ya no cuenta como venta.`
  if (v.fecha_envio) return `Cancelado después de enviarse al cliente el ${formatDia(v.fecha_envio)}.`
  return 'Cancelado antes de enviarse al cliente.'
}

export default function VentaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [editando, setEditando] = useState<0 | 1 | null>(null)

  const { datos, cargando, error, recargar } = useConsulta(async (sb) => {
    const v = sinError(await sb.from('venta').select(`${SELECT_VENTA}, linea_venta(*)`).eq('id_venta', id)
      .order('orden', { referencedTable: 'linea_venta' }).maybeSingle()) as Venta | null
    // El correo de la empresa no viene en SELECT_VENTA (el del particular sí)
    const empresa = v?.id_empresa_fk
      ? sinError(await sb.from('empresa').select('correo').eq('id_empresa', v.id_empresa_fk).maybeSingle()) as { correo: string | null } | null
      : null
    return { v, correoEmpresa: empresa?.correo ?? null }
  }, [id])

  const v = datos?.v
  const esPedido = v?.estado === 'pedido'
  useTituloPagina({
    titulo: v ? codigoVenta(v.numero) : 'Presupuesto',
    volver: esPedido ? { texto: 'Pedidos', href: '/ventas/pedidos' } : { texto: 'Presupuestos', href: '/ventas/presupuestos' },
  }, [v?.numero, esPedido])

  if (error) return <ErrorCarga mensaje={error} reintentar={recargar} />
  if (cargando && !datos) return <FichaCargando />
  if (!v) return <Vacio icono="venta" titulo="Este presupuesto no existe" texto="Puede que se haya eliminado."><Link href="/ventas/presupuestos" className="btn-secundario">Ver presupuestos</Link></Vacio>

  const venta = v
  const lineas = venta.linea_venta ?? []
  const codigo = codigoVenta(venta.numero)
  const cliente = nombreCliente(venta)
  const enlace = enlaceCliente(venta)
  const est = estadoVentaInfo(venta.estado)
  const correo = venta.particular?.correo ?? datos.correoEmpresa
  const sinLineas = () => {
    if (lineas.length) return false
    aviso('Añade al menos una línea antes de enviar o confirmar el presupuesto.', 'error')
    return true
  }

  async function cambiarEstado(estado: EstadoVenta, texto: string) {
    const anterior = venta.estado
    const sb = createClient()
    const { error: err } = await sb.from('venta').update({ estado }).eq('id_venta', venta.id_venta)
    if (err) return aviso(errorLegible(err), 'error')
    // Solo se ofrece deshacer si la base de datos admite el cambio contrario
    aviso(texto, 'exito', puedePasarVenta(estado, anterior) ? {
      deshacer: async () => {
        const { error: e2 } = await sb.from('venta').update({ estado: anterior }).eq('id_venta', venta.id_venta)
        if (e2) return aviso(errorLegible(e2), 'error')
        aviso(`${codigo} vuelve a ${estadoVentaInfo(anterior).texto}`, 'info'); recargar()
      },
    } : {})
    recargar()
  }

  function enviarCorreo() {
    if (!correo || sinLineas()) return
    window.location.href = enlaceCorreo(venta, lineas, correo)
    if (venta.estado === 'presupuesto') cambiarEstado('enviado', `Presupuesto ${codigo} enviado a ${correo}`)
  }

  function marcarEnviado() {
    if (sinLineas()) return
    cambiarEstado('enviado', `Presupuesto ${codigo} marcado como enviado`)
  }

  async function confirmarPedido() {
    if (sinLineas()) return
    if (!(await confirmar({ titulo: `¿Confirmar el presupuesto ${codigo} de ${cliente} como pedido?`, texto: `Pasará a ser un pedido de venta de ${formatEUR(venta.total, 2)}. Ya no se podrán cambiar sus líneas.`, boton: 'Confirmar pedido' }))) return
    cambiarEstado('pedido', `Presupuesto ${codigo} confirmado como pedido`)
  }

  async function cancelar() {
    const confirmacion = esPedido
      ? { titulo: `¿Cancelar el pedido ${codigo} de ${cliente}?`, texto: 'Dejará de contar como venta. Para recuperarlo habrá que ponerlo de nuevo como presupuesto y volver a confirmarlo.', boton: 'Cancelar pedido', volver: 'Volver' }
      : { titulo: `¿Cancelar el presupuesto ${codigo} de ${cliente}?`, texto: 'Ya no se podrá enviar ni confirmar, y sus líneas no se podrán cambiar. Podrás volver a ponerlo como presupuesto.', boton: 'Cancelar presupuesto', volver: 'Volver' }
    if (!(await confirmar(confirmacion))) return
    cambiarEstado('cancelado', `${esPedido ? 'Pedido' : 'Presupuesto'} ${codigo} cancelado`)
  }

  async function eliminar() {
    if (!(await confirmar({ titulo: `¿Eliminar el presupuesto ${codigo} de ${cliente}?`, texto: `Se borrarán también sus líneas (${lineas.length}).`, boton: 'Eliminar presupuesto', peligro: true }))) return
    const { error: err } = await createClient().from('venta').delete().eq('id_venta', venta.id_venta)
    if (err) return aviso(errorLegible(err), 'error')
    aviso(`Presupuesto ${codigo} eliminado`)
    router.push('/ventas/presupuestos')
  }

  const botonEditar = <button type="button" className="btn-secundario" onClick={() => setEditando(0)}><Icono nombre="lapiz" tamano={14} /> Editar</button>
  const opcionEliminar = { texto: 'Eliminar', icono: 'papelera' as const, onClick: eliminar, peligro: true, oculto: !esAdmin }
  const opcionNotas = { texto: 'Editar notas', icono: 'nota' as const, onClick: () => setEditando(1) }

  const acciones = {
    presupuesto: (
      <>
        {correo
          ? <button type="button" className="btn-primario" onClick={enviarCorreo}><Icono nombre="correo" tamano={14} /> Enviar por correo</button>
          : <button type="button" className="btn-primario" onClick={marcarEnviado} aria-describedby="sin-correo"><Icono nombre="check" tamano={14} /> Marcar como enviado</button>}
        <button type="button" className="btn-secundario" onClick={confirmarPedido}><Icono nombre="check" tamano={14} /> Confirmar pedido</button>
        {botonEditar}
        <Menu opciones={[
          { texto: 'Marcar como enviado', icono: 'check', onClick: marcarEnviado, oculto: !correo },
          { texto: 'Cancelar presupuesto', icono: 'cerrar', onClick: cancelar, peligro: true },
          opcionEliminar,
        ]} />
        {!correo && <p id="sin-correo" className="basis-full text-[12.5px] text-texto-3">El cliente no tiene correo: envíaselo por otro medio y márcalo como enviado.</p>}
      </>
    ),
    enviado: (
      <>
        <button type="button" className="btn-primario" onClick={confirmarPedido}><Icono nombre="check" tamano={14} /> Confirmar pedido</button>
        {correo && <button type="button" className="btn-secundario" onClick={enviarCorreo}><Icono nombre="correo" tamano={14} /> Reenviar</button>}
        {botonEditar}
        <Menu opciones={[{ texto: 'Cancelar presupuesto', icono: 'cerrar', onClick: cancelar, peligro: true }]} />
      </>
    ),
    pedido: <Menu opciones={[opcionNotas, { texto: 'Cancelar pedido', icono: 'cerrar', onClick: cancelar, peligro: true, oculto: !esAdmin }]} />,
    cancelado: (
      <>
        <button type="button" className="btn-primario" onClick={() => cambiarEstado('presupuesto', `${codigo} vuelve a ser un presupuesto`)}>
          <Icono nombre="izquierda" tamano={14} /> Volver a presupuesto
        </button>
        <Menu opciones={[opcionNotas, opcionEliminar]} />
      </>
    ),
  }[venta.estado]

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 pt-2 pb-10 sm:px-6">
      <CabeceraFicha
        nombre={cliente}
        titulo={`${esPedido ? 'Pedido' : 'Presupuesto'} ${codigo}`}
        foto={venta.empresa?.logo}
        cuadrado={!!venta.empresa}
        etiquetas={<>
          <Etiqueta tono={est.tono}>{est.texto}</Etiqueta>
          {validezPasada(venta) && <Etiqueta tono="amarillo">Validez pasada</Etiqueta>}
        </>}
        subtitulo={<>
          {enlace ? <Link href={enlace} className="enlace">{cliente}</Link> : cliente}
          {venta.animal && <> · <Link href={`/animales/${venta.animal.id_animal}`} className="enlace">{venta.animal.nombre}</Link> ({venta.animal.especie})</>}
          {venta.oportunidad && <> · Oportunidad <Link href={`/oportunidades/${venta.oportunidad.id_oportunidad}`} className="enlace">{venta.oportunidad.titulo}</Link></>}
        </>}
        acciones={acciones}
      >
        <CifrasFicha cifras={[
          { etiqueta: 'Total', valor: formatEUR(venta.total, 2) },
          { etiqueta: 'Fecha', valor: formatDia(venta.fecha) },
          { etiqueta: 'Validez', valor: formatDia(venta.fecha_validez) },
          {
            etiqueta: 'Comercial',
            valor: venta.responsable
              ? <span className="flex items-center gap-2 text-[14px] font-medium"><Avatar nombre={nombreCompleto(venta.responsable)} foto={venta.responsable.foto} />{nombreCompleto(venta.responsable)}</span>
              : <span className="text-[14px] font-normal text-texto-3">Sin asignar</span>,
          },
        ]} />
      </CabeceraFicha>

      <BarraFases
        fases={FASES}
        actual={venta.estado}
        etiqueta="Fases de la venta"
        // Confirmado sin enviar: ese paso sale sin marcar
        sinMarcar={venta.estado === 'pedido' && !venta.fecha_envio ? ['enviado'] : []}
        perdida={venta.estado === 'cancelado' ? { texto: textoCancelada(venta) } : undefined}
      />

      <Seccion titulo={`Líneas (${lineas.length})`} sinPadding>
        <LineasVenta venta={venta} lineas={lineas} onCambio={recargar} />
      </Seccion>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Datos">
          <dl>
            <Dato etiqueta="Cliente">{enlace ? <Link href={enlace} className="enlace">{cliente}</Link> : cliente}</Dato>
            <Dato etiqueta="Correo">{correo ? <a className="enlace" href={`mailto:${correo}`}>{correo}</a> : '—'}</Dato>
            <Dato etiqueta="Animal">{venta.animal ? <Link href={`/animales/${venta.animal.id_animal}`} className="enlace">{venta.animal.nombre}</Link> : '—'}</Dato>
            <Dato etiqueta="Comercial">{venta.responsable ? nombreCompleto(venta.responsable) : 'Sin asignar'}</Dato>
            <Dato etiqueta="Fecha">{formatDia(venta.fecha)}</Dato>
            <Dato etiqueta="Validez">{formatDia(venta.fecha_validez)}</Dato>
            <Dato etiqueta="Condiciones de pago">{condicionPagoTexto(venta.condiciones_pago)}</Dato>
            <Dato etiqueta="Oportunidad">{venta.oportunidad ? <Link href={`/oportunidades/${venta.oportunidad.id_oportunidad}`} className="enlace">{venta.oportunidad.titulo}</Link> : '—'}</Dato>
            <Dato etiqueta="Creado">{formatFechaHora(venta.fecha_creacion)}</Dato>
            <Dato etiqueta="Enviado">{formatFechaHora(venta.fecha_envio)}</Dato>
            <Dato etiqueta="Confirmado">{formatFechaHora(venta.fecha_confirmacion)}</Dato>
          </dl>
        </Seccion>
        <Seccion titulo="Notas">
          {venta.notas
            ? <p className="text-[14px] leading-relaxed whitespace-pre-line text-texto">{venta.notas}</p>
            : <p className="text-[14px] text-texto-3">Sin notas</p>}
        </Seccion>
      </div>

      <FormVenta abierto={editando !== null} venta={venta} pasoInicial={editando ?? 0} onCerrar={() => setEditando(null)} onGuardada={() => recargar()} />
    </div>
  )
}
