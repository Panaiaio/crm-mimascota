'use client'

import { useState } from 'react'
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
export default function ListaNominas({ nominas, conEmpleado, onCambio }: { nominas: Nomina[]; conEmpleado?: boolean; onCambio: () => void }) {
  const { empleado, esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [firmando, setFirmando] = useState<Nomina | null>(null)
  const [viendoFirma, setViendoFirma] = useState<Nomina | null>(null)

  const abrir = (n: Nomina) => abrirPrivado('nominas', n.archivo).catch((e) => aviso(errorLegible(e), 'error'))

  async function borrar(n: Nomina) {
    if (!(await confirmar({ titulo: `¿Borrar la nómina de ${MESES[n.mes - 1]} ${n.anio}?`, texto: n.firmada ? 'Ya está firmada: se perderá la firma.' : undefined, boton: 'Borrar', peligro: true }))) return
    const { error } = await createClient().from('nomina').delete().eq('id_nomina', n.id_nomina)
    if (error) return aviso(errorLegible(error), 'error')
    await borrarArchivo('nominas', n.archivo).catch(() => {})
    aviso('Nómina borrada')
    onCambio()
  }

  if (!nominas.length) return <Vacio icono="nomina" titulo="No hay nóminas" texto={esAdmin ? 'Sube la primera con el botón "Subir nómina".' : 'Cuando se suba tu nómina aparecerá aquí para que la firmes.'} />

  const ordenadas = [...nominas].sort((a, b) => b.anio - a.anio || b.mes - a.mes)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="tabla min-w-[640px]">
          <thead>
            <tr>
              {conEmpleado && <th className="!pl-5">Empleado</th>}
              <th className={conEmpleado ? '' : '!pl-5'}>Periodo</th>
              <th className="text-right">Importe neto</th>
              <th>Estado</th>
              <th>Firmada</th>
              <th className="w-44 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((n) => {
              const propia = n.id_empleado_fk === empleado?.id_empleado
              return (
                <tr key={n.id_nomina}>
                  {conEmpleado && (
                    <td className="!pl-5">{n.empleado && <span className="flex items-center gap-2"><Avatar nombre={nombreCompleto(n.empleado)} foto={n.empleado.foto} />{nombreCompleto(n.empleado)}</span>}</td>
                  )}
                  <td className={conEmpleado ? '' : '!pl-5'}>
                    <span className="flex items-center gap-2 font-medium"><Icono nombre="archivo" tamano={15} className="text-texto-3" /> {MESES[n.mes - 1]} {n.anio}</span>
                  </td>
                  <td className="text-right tabular-nums">{n.importe_neto != null ? formatEUR(n.importe_neto, 2) : '—'}</td>
                  <td>{n.firmada ? <Etiqueta tono="verde">Firmada</Etiqueta> : <Etiqueta tono="amarillo">Pendiente de firma</Etiqueta>}</td>
                  <td className="text-texto-2">{n.fecha_firma ? formatFechaHora(n.fecha_firma) : '—'}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      <button type="button" className="btn-secundario h-7 px-2.5" onClick={() => abrir(n)}>Ver PDF</button>
                      {propia && !n.firmada && <button type="button" className="btn-primario h-7 px-2.5" onClick={() => setFirmando(n)}><Icono nombre="firma" tamano={13} /> Firmar</button>}
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
