'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { enlaceCliente, estadoInfo, nombreCliente, origenTexto, proximoPaso } from '@/lib/crm-utils'
import { cn, errorLegible, formatDia, formatEUR, formatFechaHora, formatHora, nombreCompleto } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Actividad, Estado, Oportunidad } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import BarraProbabilidad from '@/components/ui/BarraProbabilidad'
import Seccion, { Dato } from '@/components/ui/Seccion'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FichaCargando } from '@/components/ui/Cargando'
import EstadoOportunidad from '@/components/crm/EstadoOportunidad'
import HistorialActividad from '@/components/crm/HistorialActividad'
import FormOportunidad from '@/components/crm/FormOportunidad'

export default function OportunidadPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [editando, setEditando] = useState<Oportunidad | null>(null)

  const { datos, cargando, error, recargar } = useConsulta(async (sb) => {
    const o = sinError(await sb.from('oportunidad').select(`*,
      empresa(id_empresa, nombre, logo),
      particular(id_particular, nombre, apellidos, telefono, correo),
      animal(id_animal, nombre, especie, raza),
      responsable:empleado(id_empleado, nombre, apellidos, foto)`).eq('id_oportunidad', id).maybeSingle()) as Oportunidad | null
    const acts = sinError(await sb.from('actividad').select('*, empleado(id_empleado, nombre, apellidos, foto)')
      .eq('id_oportunidad_fk', id).order('fecha', { ascending: false })) as Actividad[]
    return { o, acts }
  }, [id])

  const o = datos?.o
  useTituloPagina({ titulo: o?.titulo ?? 'Oportunidad', volver: { texto: 'Oportunidades', href: '/oportunidades' } }, [o?.titulo])

  if (error) return <ErrorCarga mensaje={error} reintentar={recargar} />
  if (cargando && !datos) return <FichaCargando />
  if (!o) return <Vacio icono="oportunidad" titulo="Esta oportunidad no existe" texto="Puede que se haya eliminado."><Link href="/oportunidades" className="btn-secundario">Ver oportunidades</Link></Vacio>

  const est = estadoInfo(o.estado)
  const enlace = enlaceCliente(o)
  const telefono = o.particular?.telefono ?? o.telefono_contacto
  const correo = o.particular?.correo ?? o.correo_contacto
  const paso = proximoPaso(o)
  const pasoPorPresupuesto = o.estado === 'presupuesto' || (datos?.acts ?? []).some((a) => a.tipo === 'estado' && a.descripcion.includes('Presupuesto'))

  async function cambiarEstado(estado: Estado, extra: { motivo_descarte?: string } = {}) {
    if (!o) return
    if (estado === 'cita' && !o.fecha_cita) return setEditando({ ...o, estado: 'cita' })
    const { error: err } = await createClient().from('oportunidad').update({ estado, ...extra }).eq('id_oportunidad', o.id_oportunidad)
    if (err) return aviso(errorLegible(err), 'error')
    aviso(`Movida a ${estadoInfo(estado).texto}`)
    recargar()
  }

  async function eliminar() {
    if (!o) return
    if (!(await confirmar({ titulo: '¿Eliminar esta oportunidad?', texto: 'También se borrará su historial.', boton: 'Eliminar', peligro: true }))) return
    const { error: err } = await createClient().from('oportunidad').delete().eq('id_oportunidad', o.id_oportunidad)
    if (err) return aviso(errorLegible(err), 'error')
    aviso('Oportunidad eliminada')
    router.push('/oportunidades')
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 pt-2 pb-10 sm:px-6">
      {/* Cabecera */}
      <div className="tarjeta p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar nombre={nombreCliente(o)} foto={o.empresa?.logo} cuadrado={!!o.empresa} tamano="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-semibold tracking-tight">{o.titulo}</h2>
                <Etiqueta tono={est.tono}>{est.texto}</Etiqueta>
                {o.origen === 'web' && <Etiqueta tono="gris">Desde la web</Etiqueta>}
              </div>
              <p className="mt-1 text-[13.5px] text-texto-2">
                {enlace ? <Link href={enlace} className="enlace">{nombreCliente(o)}</Link> : nombreCliente(o)}
                {o.empresa ? ' · Empresa' : ' · Particular'}
                {o.animal && <> · <Link href={`/animales/${o.animal.id_animal}`} className="enlace">{o.animal.nombre}</Link> ({o.animal.especie})</>}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {telefono && <a href={`tel:${telefono.replace(/\s/g, '')}`} className="btn-secundario"><Icono nombre="telefono" tamano={14} /> Llamar</a>}
            {correo && <a href={`mailto:${correo}?subject=${encodeURIComponent(o.titulo)}`} className="btn-secundario"><Icono nombre="correo" tamano={14} /> Email</a>}
            <button type="button" className="btn-primario" onClick={() => setEditando(o)}><Icono nombre="lapiz" tamano={14} /> Editar</button>
            <Menu opciones={[{ texto: 'Eliminar', icono: 'papelera', onClick: eliminar, peligro: true, oculto: !esAdmin }]} />
          </div>
        </div>
        <div className="mt-5 grid gap-4 border-t border-borde pt-4 sm:grid-cols-4">
          <div><p className="text-[12.5px] text-texto-3">Valor</p><p className="mt-1 text-[18px] font-semibold tabular-nums">{formatEUR(o.valor)}</p></div>
          <div><p className="text-[12.5px] text-texto-3">Probabilidad</p><BarraProbabilidad valor={o.probabilidad} className="mt-2" /></div>
          <div>
            <p className="text-[12.5px] text-texto-3">Próximo paso</p>
            <p className={cn('mt-1 text-[14px] font-medium', paso?.vencido && 'text-rose-700 dark:text-rose-400')}>
              {paso ? `${paso.tipo === 'cita' ? 'Cita' : 'Seguimiento'} · ${paso.texto}${paso.vencido ? ' (descartado)' : ''}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[12.5px] text-texto-3">Responsable</p>
            {o.responsable ? (
              <p className="mt-1 flex items-center gap-2 text-[14px] font-medium"><Avatar nombre={nombreCompleto(o.responsable)} foto={o.responsable.foto} />{nombreCompleto(o.responsable)}</p>
            ) : <p className="mt-1 text-[14px] text-texto-3">Sin asignar</p>}
          </div>
        </div>
      </div>

      <EstadoOportunidad oportunidad={o} onCambiar={cambiarEstado} pasoPorPresupuesto={pasoPorPresupuesto} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {o.mensaje && (
            <Seccion titulo={o.origen === 'web' ? 'Mensaje recibido' : 'Descripción'}>
              <p className="text-[14px] leading-relaxed whitespace-pre-line text-texto">{o.mensaje}</p>
            </Seccion>
          )}
          <Seccion titulo="Historial" sinPadding>
            <HistorialActividad idOportunidad={o.id_oportunidad} actividades={datos?.acts ?? []} onCambio={recargar} />
          </Seccion>
        </div>

        <Seccion titulo="Datos">
          <dl>
            <Dato etiqueta="Cliente">{enlace ? <Link href={enlace} className="enlace">{nombreCliente(o)}</Link> : nombreCliente(o)}</Dato>
            <Dato etiqueta="Teléfono">{telefono ? <a className="enlace" href={`tel:${telefono.replace(/\s/g, '')}`}>{telefono}</a> : '—'}</Dato>
            <Dato etiqueta="Correo">{correo ? <a className="enlace" href={`mailto:${correo}`}>{correo}</a> : '—'}</Dato>
            <Dato etiqueta="Animal">{o.animal ? <Link href={`/animales/${o.animal.id_animal}`} className="enlace">{o.animal.nombre}</Link> : o.nombre_animal ?? '—'}</Dato>
            <Dato etiqueta="Servicio">{o.servicio ?? '—'}</Dato>
            <Dato etiqueta="Cita">{o.fecha_cita ? `${formatDia(o.fecha_cita)}${o.hora_cita ? ' a las ' + formatHora(o.hora_cita) : ''}` : '—'}</Dato>
            <Dato etiqueta="Seguimiento">{o.fecha_seguimiento ? formatDia(o.fecha_seguimiento) : '—'}</Dato>
            <Dato etiqueta="Origen">{origenTexto(o.origen)}</Dato>
            {o.origen === 'web' && <Dato etiqueta="Privacidad">{o.consentimiento ? 'Aceptada' : 'No consta'}</Dato>}
            {o.estado === 'descartado' && <Dato etiqueta="Motivo">{o.motivo_descarte}</Dato>}
            <Dato etiqueta="Creada">{formatFechaHora(o.fecha_creacion)}</Dato>
            <Dato etiqueta="Modificada">{formatFechaHora(o.fecha_actualizacion)}</Dato>
          </dl>
        </Seccion>
      </div>

      <FormOportunidad abierto={!!editando} oportunidad={editando} onCerrar={() => setEditando(null)} onGuardada={() => recargar()} />
    </div>
  )
}
