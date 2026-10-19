'use client'

import { useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { abrirPrivado, borrarArchivo } from '@/lib/archivos'
import { MESES } from '@/lib/rrhh-utils'
import { errorLegible, formatEUR, formatFechaHora, nombreCompleto } from '@/lib/utils'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import type { Nomina } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import Menu from '@/components/ui/Menu'
import Modal from '@/components/ui/Modal'
import Vacio from '@/components/ui/Vacio'
import Icono from '@/components/ui/Icono'
import FirmarNomina from './FirmarNomina'

/** Nóminas: ver el PDF, firmarlas (su dueño) y borrarlas (administrador) */
export default function ListaNominas({ nominas, conEmpleado, onCambio, accion }: { nominas: Nomina[]; conEmpleado?: boolean; onCambio: () => void; accion?: ReactNode }) {
  const { empleado, esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [firmando, setFirmando] = useState<Nomina | null>(null)
  const [viendoFirma, setViendoFirma] = useState<Nomina | null>(null)

  const abrir = (n: Nomina) => abrirPrivado('nominas', n.archivo).catch((e) => aviso(errorLegible(e), 'error'))

  async function borrar(n: Nomina) {
    if (!(await confirmar({ titulo: `¿Borrar la nómina de ${MESES[n.mes - 1]} ${n.anio}${n.empleado ? ` de ${nombreCompleto(n.empleado)}` : ''}?`, texto: n.firmada ? 'Se borra el PDF y también la firma del trabajador.' : 'Se borra el PDF; el trabajador ya no podrá verla ni firmarla.', boton: 'Borrar nómina', peligro: true }))) return
    const { error } = await createClient().from('nomina').delete().eq('id_nomina', n.id_nomina)
    if (error) return aviso(errorLegible(error), 'error')
    await borrarArchivo('nominas', n.archivo).catch(() => {})
    aviso(`Nómina de ${MESES[n.mes - 1]} ${n.anio} borrada`)
    onCambio()
  }

  if (!nominas.length) return <Vacio icono="nomina" titulo="No hay nóminas" texto={esAdmin ? 'Sube el PDF de la nómina y el trabajador podrá firmarla desde aquí.' : 'Cuando se suba tu nómina aparecerá aquí para que la firmes.'}>{accion}</Vacio>

  const ordenadas = [...nominas].sort((a, b) => b.anio - a.anio || b.mes - a.mes)

  return (
    <>
      <div className="@container">
        <table className="tabla">
          <thead>
            <tr>
              {conEmpleado && <th className="w-full @min-[1000px]:w-auto !pl-6">Empleado</th>}
              <th className={conEmpleado ? 'hidden @min-[560px]:table-cell' : 'w-full @min-[1000px]:w-auto !pl-6'}>Periodo</th>
              <th className="hidden text-right @min-[740px]:table-cell">Importe neto</th>
              <th className="hidden @min-[740px]:table-cell">Estado</th>
              <th className="hidden @min-[1000px]:table-cell">Firmada</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((n) => {
              const propia = n.id_empleado_fk === empleado?.id_empleado
              return (
                <tr key={n.id_nomina}>
                  {conEmpleado && (
                    <td className="max-w-0 @min-[1000px]:max-w-none min-w-[140px] !pl-6">{n.empleado && (
                      <span className="flex min-w-0 items-center gap-2">
                        <Avatar nombre={nombreCompleto(n.empleado)} foto={n.empleado.foto} />
                        <span className="min-w-0 max-w-[280px] leading-tight">
                          <span className="block truncate">{nombreCompleto(n.empleado)}</span>
                          <span className="block text-[12.5px] text-texto-3 @min-[560px]:hidden">{MESES[n.mes - 1]} {n.anio}</span>
                        </span>
                      </span>
                    )}</td>
                  )}
                  <td className={conEmpleado ? 'hidden @min-[560px]:table-cell' : 'max-w-0 @min-[1000px]:max-w-none min-w-[120px] !pl-6'}>
                    <span className="flex items-center gap-2 font-medium"><Icono nombre="archivo" tamano={15} className="text-texto-3" /> {MESES[n.mes - 1]} {n.anio}</span>
                  </td>
                  <td className="hidden text-right tabular-nums @min-[740px]:table-cell">{n.importe_neto != null ? formatEUR(n.importe_neto, 2) : '—'}</td>
                  <td className="hidden @min-[740px]:table-cell">{n.firmada ? <Etiqueta tono="verde">Firmada</Etiqueta> : <Etiqueta tono="amarillo">Pendiente de firma</Etiqueta>}</td>
                  <td className="hidden text-texto-2 @min-[1000px]:table-cell">{n.fecha_firma ? formatFechaHora(n.fecha_firma) : '—'}</td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" className="btn-secundario" onClick={() => abrir(n)} aria-label="Ver PDF"><Icono nombre="archivo" tamano={13} /><span className="hidden @min-[560px]:inline">Ver PDF</span></button>
                      {propia && !n.firmada && <button type="button" className="btn-secundario" onClick={() => setFirmando(n)}><Icono nombre="firma" tamano={13} /> Firmar</button>}
                      <Menu opciones={[
                        { texto: 'Ver firma', icono: 'firma', onClick: () => setViendoFirma(n), oculto: !n.firmada },
                        { texto: 'Borrar', icono: 'papelera', onClick: () => borrar(n), peligro: true, oculto: !esAdmin },
                      ]} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <FirmarNomina nomina={firmando} onCerrar={() => setFirmando(null)} onFirmada={onCambio} />
      <Modal abierto={!!viendoFirma} onCerrar={() => setViendoFirma(null)} titulo="Firma" ancho="sm"
        subtitulo={viendoFirma ? `${viendoFirma.empleado ? nombreCompleto(viendoFirma.empleado) + ' · ' : ''}${MESES[viendoFirma.mes - 1]} ${viendoFirma.anio} · ${formatFechaHora(viendoFirma.fecha_firma)}` : ''}>
        <div className="p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {viendoFirma?.firma && <img src={viendoFirma.firma} alt="Firma" className="w-full rounded-xl border border-borde bg-white" />}
        </div>
      </Modal>
    </>
  )
}
