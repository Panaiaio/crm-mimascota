'use client'

import Link from 'next/link'
import { ESTADOS, SELECT_OPORTUNIDAD, esAbierta, nombreCliente, proximoPaso } from '@/lib/crm-utils'
import { MESES } from '@/lib/rrhh-utils'
import { cn, diasHasta, formatDia, formatEUR, formatFechaLarga, formatHora, haceCuanto, hoyISO, nombreCompleto, sumarDias } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Candidato, EmpleadoBreve, Nomina, Oportunidad, TareaInicio, Vacacion } from '@/types'
import Seccion, { Cifra } from '@/components/ui/Seccion'
import Avatar from '@/components/ui/Avatar'
import Etiqueta, { PUNTOS } from '@/components/ui/Etiqueta'
import Icono from '@/components/ui/Icono'
import BarraProgreso from '@/components/ui/BarraProgreso'
import { BloqueCargando, ErrorCarga } from '@/components/ui/Cargando'
import BotonFichar from '@/components/rrhh/BotonFichar'

function saludo() {
  const h = new Date().getHours()
  return h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches'
}

export default function InicioPage() {
  const { empleado, esAdmin } = useSesion()
  useTituloPagina({ titulo: 'Inicio' })

  const { datos, cargando, error, recargar } = useConsulta(async (sb) => {
    const ops = sinError(await sb.from('oportunidad').select(SELECT_OPORTUNIDAD).order('fecha_creacion', { ascending: false })) as Oportunidad[]
    const rrhh = {
      vacaciones: [] as (Vacacion & { empleado: EmpleadoBreve })[],
      candidatos: [] as Candidato[],
      incorporaciones: [] as (EmpleadoBreve & { tarea_inicio: TareaInicio[] })[],
      nominas: [] as Nomina[],
      misVacaciones: [] as Vacacion[],
      misTareas: [] as TareaInicio[],
    }
    if (esAdmin) {
      const [v, c, i] = await Promise.all([
        sb.from('vacacion').select('*, empleado:empleado!id_empleado_fk(id_empleado, nombre, apellidos, foto)').eq('estado', 'pendiente').order('fecha_inicio'),
        sb.from('candidato').select('*').in('estado', ['recibido', 'entrevista', 'oferta']),
        sb.from('empleado').select('id_empleado, nombre, apellidos, foto, tarea_inicio!id_empleado_fk(*)').eq('activo', true),
      ])
      rrhh.vacaciones = sinError(v) as typeof rrhh.vacaciones
      rrhh.candidatos = sinError(c) as Candidato[]
      rrhh.incorporaciones = (sinError(i) as typeof rrhh.incorporaciones).filter((e) => e.tarea_inicio.some((t) => !t.completada))
    }
    if (empleado) {
      const [n, v, t] = await Promise.all([
        sb.from('nomina').select('*').eq('id_empleado_fk', empleado.id_empleado).eq('firmada', false),
        sb.from('vacacion').select('*').eq('id_empleado_fk', empleado.id_empleado).gte('fecha_fin', hoyISO()).order('fecha_inicio'),
        sb.from('tarea_inicio').select('*').eq('id_empleado_fk', empleado.id_empleado),
      ])
      rrhh.nominas = sinError(n) as Nomina[]
      rrhh.misVacaciones = sinError(v) as Vacacion[]
      rrhh.misTareas = sinError(t) as TareaInicio[]
    }
    return { ops, rrhh }
  }, [esAdmin, empleado?.id_empleado])

  if (error) return <ErrorCarga mensaje={error} reintentar={recargar} />

  const ops = datos?.ops ?? []
  const hoy = hoyISO()
  const abiertas = ops.filter((o) => esAbierta(o.estado))
  const nuevas = ops.filter((o) => o.estado === 'nuevo')
  const citas = ops.filter((o) => o.fecha_cita && o.fecha_cita >= hoy && o.fecha_cita <= sumarDias(hoy, 1) && o.estado === 'cita')
    .sort((a, b) => `${a.fecha_cita}${a.hora_cita}`.localeCompare(`${b.fecha_cita}${b.hora_cita}`))
  const seguimientos = abiertas.filter((o) => o.fecha_seguimiento && o.fecha_seguimiento <= hoy && o.estado !== 'cita')
    .sort((a, b) => (a.fecha_seguimiento ?? '').localeCompare(b.fecha_seguimiento ?? ''))
  const cerradas90 = ops.filter((o) => ['atendido', 'descartado'].includes(o.estado) && -diasHasta(o.fecha_actualizacion) <= 90)
  const conversion = cerradas90.length ? Math.round((cerradas90.filter((o) => o.estado === 'atendido').length / cerradas90.length) * 100) : 0
  const porEstado = ESTADOS.map((e) => ({ ...e, n: ops.filter((o) => o.estado === e.id).length, valor: ops.filter((o) => o.estado === e.id).reduce((s, o) => s + Number(o.valor), 0) }))
  const maxEstado = Math.max(1, ...porEstado.map((e) => e.n))
  const rrhh = datos?.rrhh

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 pt-1 pb-10 sm:px-6">
      <div>
        <h2 className="text-[24px] font-semibold tracking-tight">{saludo()}{empleado ? `, ${empleado.nombre}` : ''}</h2>
        <p className="mt-0.5 text-[13.5px] text-texto-3 first-letter:uppercase">{formatFechaLarga(new Date())}</p>
      </div>

      {empleado && <BotonFichar />}

      {cargando && !datos ? <BloqueCargando alto={400} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Cifra etiqueta="Oportunidades abiertas" valor={abiertas.length} detalle={`${formatEUR(abiertas.reduce((s, o) => s + Number(o.valor), 0))} en juego`} />
            <Cifra etiqueta="Sin contestar" valor={nuevas.length} tono={nuevas.length ? 'amarillo' : 'verde'} detalle={nuevas.length ? `La más antigua ${haceCuanto(nuevas.at(-1)!.fecha_creacion)}` : 'Todo contestado'} />
            <Cifra etiqueta="Citas hoy" valor={citas.filter((o) => o.fecha_cita === hoy).length} detalle={`${citas.filter((o) => o.fecha_cita !== hoy).length} mañana`} />
            <Cifra etiqueta="Conversión (90 días)" valor={`${conversion}%`} tono={conversion >= 60 ? 'verde' : conversion >= 35 ? 'amarillo' : cerradas90.length ? 'rojo' : undefined} detalle={`${cerradas90.filter((o) => o.estado === 'atendido').length} atendidas de ${cerradas90.length} cerradas`} />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="min-w-0 space-y-5 xl:col-span-2">
              <Seccion titulo="Citas de hoy y mañana" acciones={<Link href="/oportunidades" className="btn-fantasma">Ver todas</Link>} sinPadding>
                {citas.length ? (
                  <ul className="divide-y divide-borde-suave">
                    {citas.map((o) => (
                      <li key={o.id_oportunidad}>
                        <Link href={`/oportunidades/${o.id_oportunidad}`} className="flex items-center gap-4 px-5 py-3 hover:bg-hover">
                          <span className="w-16 shrink-0 text-center">
                            <span className="block text-[15px] font-semibold tabular-nums">{formatHora(o.hora_cita) || '—'}</span>
                            <span className="block text-[11.5px] text-texto-3">{o.fecha_cita === hoy ? 'Hoy' : 'Mañana'}</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{o.titulo}</p>
                            <p className="truncate text-[12.5px] text-texto-3">{nombreCliente(o)}{o.animal ? ` · ${o.animal.nombre} (${o.animal.especie})` : ''}</p>
                          </div>
                          {o.responsable && <Avatar nombre={nombreCompleto(o.responsable)} foto={o.responsable.foto} />}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="px-5 py-8 text-center text-[13px] text-texto-3">No hay citas hoy ni mañana.</p>}
              </Seccion>

              <Seccion titulo="Para contestar y seguimientos" sinPadding>
                {nuevas.length + seguimientos.length ? (
                  <ul className="divide-y divide-borde-suave">
                    {[...nuevas.map((o) => ({ o, tipo: 'nueva' as const })), ...seguimientos.map((o) => ({ o, tipo: 'seguimiento' as const }))].slice(0, 10).map(({ o, tipo }) => {
                      const paso = proximoPaso(o)
                      return (
                        <li key={tipo + o.id_oportunidad}>
                          <Link href={`/oportunidades/${o.id_oportunidad}`} className="flex items-center gap-3 px-5 py-3 hover:bg-hover">
                            <span className={cn('size-2 shrink-0 rounded-full', tipo === 'nueva' ? PUNTOS.azul : paso?.vencido ? PUNTOS.rojo : PUNTOS.amarillo)} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{o.titulo}</p>
                              <p className="truncate text-[12.5px] text-texto-3">{nombreCliente(o)} · {tipo === 'nueva' ? `recibida ${haceCuanto(o.fecha_creacion)}${o.origen === 'web' ? ' desde la web' : ''}` : `seguimiento ${formatDia(o.fecha_seguimiento)}`}</p>
                            </div>
                            {tipo === 'nueva' ? <Etiqueta tono="azul">Sin contestar</Etiqueta> : paso?.vencido ? <Etiqueta tono="rojo">Vencido</Etiqueta> : <Etiqueta tono="amarillo">Hoy</Etiqueta>}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                ) : <p className="px-5 py-8 text-center text-[13px] text-texto-3">Todo al día.</p>}
              </Seccion>

              <Seccion titulo="Oportunidades por estado">
                <ul className="space-y-2.5">
                  {porEstado.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 text-[13px]">
                      <span className="w-24 shrink-0 text-texto-2">{e.texto}</span>
                      <div className="h-6 flex-1 overflow-hidden rounded-md bg-hover">
                        <div className={cn('h-full rounded-md', PUNTOS[e.tono])} style={{ width: `${(e.n / maxEstado) * 100}%`, opacity: 0.85 }} />
                      </div>
                      <span className="w-8 text-right font-medium tabular-nums">{e.n}</span>
                      <span className="hidden w-24 text-right text-texto-3 tabular-nums sm:block">{formatEUR(e.valor)}</span>
                    </li>
                  ))}
                </ul>
              </Seccion>
            </div>

            <div className="space-y-5">
              {esAdmin && rrhh && (
                <Seccion titulo="Recursos humanos: por revisar">
                  <ul className="space-y-4 text-[13.5px]">
                    <li>
                      <Link href="/rrhh/vacaciones" className="flex items-center justify-between font-medium hover:underline">
                        Vacaciones pendientes <Etiqueta tono={rrhh.vacaciones.length ? 'amarillo' : 'verde'}>{rrhh.vacaciones.length}</Etiqueta>
                      </Link>
                      <ul className="mt-2 space-y-1.5">
                        {rrhh.vacaciones.slice(0, 3).map((v) => (
                          <li key={v.id_vacacion} className="flex items-center gap-2 text-[12.5px] text-texto-2">
                            <Avatar nombre={nombreCompleto(v.empleado)} foto={v.empleado.foto} tamano="xs" />
                            {v.empleado.nombre} · {formatDia(v.fecha_inicio)} → {formatDia(v.fecha_fin)} ({v.dias} d)
                          </li>
                        ))}
                      </ul>
                    </li>
                    <li className="border-t border-borde pt-4">
                      <Link href="/rrhh/seleccion" className="flex items-center justify-between font-medium hover:underline">
                        Candidatos en proceso <Etiqueta tono={rrhh.candidatos.length ? 'amarillo' : 'gris'}>{rrhh.candidatos.length}</Etiqueta>
                      </Link>
                      <p className="mt-1 text-[12.5px] text-texto-3">
                        {rrhh.candidatos.filter((c) => c.estado === 'recibido').length} CV por revisar · {rrhh.candidatos.filter((c) => c.estado === 'entrevista').length} en entrevista · {rrhh.candidatos.filter((c) => c.estado === 'oferta').length} con oferta
                      </p>
                    </li>
                    <li className="border-t border-borde pt-4">
                      <p className="flex items-center justify-between font-medium">Incorporaciones en curso <Etiqueta tono={rrhh.incorporaciones.length ? 'amarillo' : 'verde'}>{rrhh.incorporaciones.length}</Etiqueta></p>
                      <ul className="mt-2 space-y-2">
                        {rrhh.incorporaciones.map((e) => (
                          <li key={e.id_empleado}>
                            <Link href={`/rrhh/empleados/${e.id_empleado}`} className="flex items-center gap-2.5 hover:underline">
                              <Avatar nombre={nombreCompleto(e)} foto={e.foto} />
                              <span className="flex-1 truncate text-[13px]">{nombreCompleto(e)}</span>
                              <BarraProgreso hechas={e.tarea_inicio.filter((t) => t.completada).length} total={e.tarea_inicio.length} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                </Seccion>
              )}

              {empleado && rrhh && (
                <Seccion titulo="Lo tuyo">
                  <ul className="space-y-3 text-[13.5px]">
                    <li>
                      <Link href="/rrhh/nominas" className="flex items-center justify-between hover:underline">
                        <span className="flex items-center gap-2"><Icono nombre="nomina" tamano={15} className="text-texto-3" /> Nóminas por firmar</span>
                        <Etiqueta tono={rrhh.nominas.length ? 'amarillo' : 'verde'}>{rrhh.nominas.length ? rrhh.nominas.map((n) => MESES[n.mes - 1]).join(', ') : 'Ninguna'}</Etiqueta>
                      </Link>
                    </li>
                    <li>
                      <Link href="/rrhh/vacaciones" className="flex items-center justify-between hover:underline">
                        <span className="flex items-center gap-2"><Icono nombre="vacaciones" tamano={15} className="text-texto-3" /> Próximas vacaciones</span>
                        {rrhh.misVacaciones.length ? (
                          <Etiqueta tono={rrhh.misVacaciones[0].estado === 'aprobada' ? 'verde' : rrhh.misVacaciones[0].estado === 'pendiente' ? 'amarillo' : 'rojo'}>
                            {formatDia(rrhh.misVacaciones[0].fecha_inicio)} · {rrhh.misVacaciones[0].estado}
                          </Etiqueta>
                        ) : <span className="text-texto-3">Ninguna</span>}
                      </Link>
                    </li>
                    {rrhh.misTareas.some((t) => !t.completada) && (
                      <li>
                        <Link href={`/rrhh/empleados/${empleado.id_empleado}`} className="flex items-center justify-between hover:underline">
                          <span className="flex items-center gap-2"><Icono nombre="check" tamano={15} className="text-texto-3" /> Tu check de inicio</span>
                          <BarraProgreso hechas={rrhh.misTareas.filter((t) => t.completada).length} total={rrhh.misTareas.length} />
                        </Link>
                      </li>
                    )}
                  </ul>
                </Seccion>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
