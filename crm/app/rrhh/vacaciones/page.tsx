'use client'

import { useMemo, useState } from 'react'
import { saldoVacaciones } from '@/lib/rrhh-utils'
import { formatDia, hoyISO, nombreCompleto, sumarDias } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Vacacion } from '@/types'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import Seccion, { Cifra } from '@/components/ui/Seccion'
import Etiqueta from '@/components/ui/Etiqueta'
import Avatar from '@/components/ui/Avatar'
import Icono from '@/components/ui/Icono'
import { ErrorCarga, BloqueCargando } from '@/components/ui/Cargando'
import ListaVacaciones from '@/components/rrhh/ListaVacaciones'
import FormVacacion from '@/components/rrhh/FormVacacion'

const SELECT = '*, empleado:empleado!id_empleado_fk(id_empleado, nombre, apellidos, foto), revisor:empleado!id_revisor_fk(id_empleado, nombre, apellidos, foto)'

export default function VacacionesPage() {
  const { empleado, esAdmin } = useSesion()
  const [pestana, setPestana] = useState(esAdmin ? 'pendientes' : 'mias')
  const [estado, setEstado] = useState('todas')
  const [pidiendo, setPidiendo] = useState(false)

  const { datos, cargando, error, recargar } = useConsulta(async (sb) =>
    sinError(await sb.from('vacacion').select(SELECT).order('fecha_inicio', { ascending: false })) as Vacacion[], [])

  const todas = useMemo(() => datos ?? [], [datos])
  const mias = todas.filter((v) => v.id_empleado_fk === empleado?.id_empleado)
  const pendientes = todas.filter((v) => v.estado === 'pendiente')
  const saldo = saldoVacaciones(empleado?.dias_vacaciones ?? 0, mias)
  const hoy = hoyISO()
  const proximas = todas.filter((v) => v.estado === 'aprobada' && v.fecha_fin >= hoy && v.fecha_inicio <= sumarDias(hoy, 45))
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))

  useTituloPagina({
    titulo: 'Vacaciones',
    insignia: esAdmin && pendientes.length ? <Etiqueta punto tono="amarillo">{pendientes.length} por revisar</Etiqueta> : undefined,
  }, [pendientes.length, esAdmin])

  const lista = (pestana === 'mias' ? mias : pestana === 'pendientes' ? pendientes : todas)
    .filter((v) => pestana === 'pendientes' || estado === 'todas' || v.estado === estado)

  return (
    <div className="flex h-full flex-col">
      <Pestanas activa={pestana} onCambiar={setPestana} pestanas={[
        ...(esAdmin ? [{ id: 'pendientes', texto: 'Por revisar', contador: pendientes.length }] : []),
        { id: 'mias', texto: 'Mis vacaciones', contador: mias.length },
        ...(esAdmin ? [{ id: 'todas', texto: 'Todo el equipo', contador: todas.length }] : []),
      ]} />
      <BarraFiltros
        filtros={pestana !== 'pendientes' && (
          <FiltroPastilla etiqueta="Estado" valor={estado} onChange={setEstado} opciones={[
            { valor: 'todas', texto: 'Todas' }, { valor: 'pendiente', texto: 'Pendientes' }, { valor: 'aprobada', texto: 'Aprobadas' }, { valor: 'rechazada', texto: 'Rechazadas' },
          ]} />
        )}
        acciones={empleado && <button type="button" className="btn-primario" onClick={() => setPidiendo(true)}><Icono nombre="mas" tamano={14} /> Pedir vacaciones</button>}
      />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-10 sm:px-6">
        {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : cargando && !datos ? <BloqueCargando alto={300} /> : (
          <>
            {empleado && pestana === 'mias' && (
              <div className="grid gap-4 sm:grid-cols-4">
                <Cifra etiqueta={`Días al año (${new Date().getFullYear()})`} valor={saldo.total} />
                <Cifra etiqueta="Aprobados" valor={saldo.aprobados} tono="verde" />
                <Cifra etiqueta="Pendientes de aprobar" valor={saldo.pendientes} tono={saldo.pendientes ? 'amarillo' : undefined} />
                <Cifra etiqueta="Disponibles" valor={saldo.disponibles} tono={saldo.disponibles ? undefined : 'rojo'} />
              </div>
            )}
            <div className="grid gap-5 xl:grid-cols-3">
              <Seccion titulo={pestana === 'pendientes' ? 'Solicitudes por revisar' : pestana === 'mias' ? 'Mis solicitudes' : 'Todas las solicitudes'} sinPadding className="xl:col-span-2">
                <ListaVacaciones vacaciones={lista} conEmpleado={pestana !== 'mias'} onCambio={recargar} />
              </Seccion>
              <Seccion titulo="Quién está fuera (próximas semanas)">
                {!esAdmin && <p className="mb-3 text-[12.5px] text-texto-3">Solo ves tus propias vacaciones.</p>}
                {proximas.length ? (
                  <ul className="space-y-3">
                    {proximas.map((v) => (
                      <li key={v.id_vacacion} className="flex items-center gap-3">
                        {v.empleado && <Avatar nombre={nombreCompleto(v.empleado)} foto={v.empleado.foto} tamano="md" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{v.empleado ? nombreCompleto(v.empleado) : ''}</p>
                          <p className="text-[12.5px] text-texto-3">{formatDia(v.fecha_inicio)} → {formatDia(v.fecha_fin)} · {v.dias} días</p>
                        </div>
                        {v.fecha_inicio <= hoy && <Etiqueta tono="amarillo">Ahora</Etiqueta>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-[13px] text-texto-3">Nadie tiene vacaciones aprobadas en las próximas semanas.</p>}
              </Seccion>
            </div>
          </>
        )}
      </div>
      <FormVacacion abierto={pidiendo} disponibles={saldo.disponibles} onCerrar={() => setPidiendo(false)} onGuardada={recargar} />
    </div>
  )
}
