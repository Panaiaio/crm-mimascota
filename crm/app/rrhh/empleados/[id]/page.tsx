'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { deVacacionesHoy, saldoVacaciones, textoTrimestre, trimestreActual } from '@/lib/rrhh-utils'
import { edad, formatFecha, nombreCompleto } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Empleado, Evaluacion, Fichaje, Nomina, TareaInicio, Vacacion } from '@/types'
import CabeceraFicha, { CifrasFicha } from '@/components/ui/CabeceraFicha'
import Etiqueta from '@/components/ui/Etiqueta'
import Pestanas from '@/components/ui/Pestanas'
import Seccion, { Dato } from '@/components/ui/Seccion'
import Estrellas from '@/components/ui/Estrellas'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FichaCargando } from '@/components/ui/Cargando'
import CheckInicio from '@/components/rrhh/CheckInicio'
import ListaFichajes from '@/components/rrhh/ListaFichajes'
import ListaVacaciones from '@/components/rrhh/ListaVacaciones'
import ListaEvaluaciones from '@/components/rrhh/ListaEvaluaciones'
import ListaNominas from '@/components/rrhh/ListaNominas'
import BotonFichar from '@/components/rrhh/BotonFichar'
import FormEmpleado from '@/components/rrhh/FormEmpleado'
import FormVacacion from '@/components/rrhh/FormVacacion'
import FormEvaluacion from '@/components/rrhh/FormEvaluacion'
import FormNomina from '@/components/rrhh/FormNomina'

export default function EmpleadoPage() {
  const { id } = useParams<{ id: string }>()
  const { empleado: yo, esAdmin } = useSesion()
  const [pestana, setPestana] = useState('resumen')
  const [modal, setModal] = useState<'editar' | 'vacacion' | 'evaluacion' | 'nomina' | null>(null)
  const [evaluando, setEvaluando] = useState<Evaluacion | null>(null)
  const propio = yo?.id_empleado === id
  const verTodo = esAdmin || propio

  const { datos, cargando, error, recargar } = useConsulta(async (sb) => {
    const e = sinError(await sb.from('empleado').select('*').eq('id_empleado', id).maybeSingle()) as Empleado | null
    if (!e || !verTodo) return { e, tareas: [], vacaciones: [], evaluaciones: [], nominas: [], fichajes: [] }
    const hace60 = new Date(Date.now() - 60 * 86_400_000).toISOString()
    const [t, v, ev, n, f] = await Promise.all([
      sb.from('tarea_inicio').select('*').eq('id_empleado_fk', id),
      sb.from('vacacion').select('*, revisor:empleado!id_revisor_fk(id_empleado, nombre, apellidos, foto)').eq('id_empleado_fk', id).order('fecha_inicio', { ascending: false }),
      sb.from('evaluacion').select('*, evaluador:empleado!id_evaluador_fk(id_empleado, nombre, apellidos, foto)').eq('id_empleado_fk', id),
      sb.from('nomina').select('*').eq('id_empleado_fk', id),
      sb.from('fichaje').select('*').eq('id_empleado_fk', id).gte('entrada', hace60).order('entrada', { ascending: false }),
    ])
    return {
      e,
      tareas: sinError(t) as TareaInicio[],
      vacaciones: sinError(v) as Vacacion[],
      evaluaciones: sinError(ev) as Evaluacion[],
      nominas: sinError(n) as Nomina[],
      fichajes: sinError(f) as Fichaje[],
    }
  }, [id, verTodo])

  const e = datos?.e
  useTituloPagina({ titulo: e ? nombreCompleto(e) : 'Empleado', volver: { texto: 'Empleados', href: '/rrhh/empleados' } }, [e?.nombre, e?.apellidos])

  if (error) return <ErrorCarga mensaje={error} reintentar={recargar} />
  if (cargando && !datos) return <FichaCargando />
  if (!e || !datos) return <Vacio icono="equipo" titulo="Este empleado no existe"><Link href="/rrhh/empleados" className="btn-secundario">Ver empleados</Link></Vacio>

  const saldo = saldoVacaciones(e.dias_vacaciones, datos.vacaciones)
  const hechas = datos.tareas.filter((t) => t.completada).length
  const { anio, trimestre } = trimestreActual()
  const evalActual = datos.evaluaciones.find((x) => x.anio === anio && x.trimestre === trimestre) ?? null
  const media = datos.evaluaciones.length ? datos.evaluaciones.reduce((s, x) => s + x.nota, 0) / datos.evaluaciones.length : 0
  const pendientesFirma = datos.nominas.filter((n) => !n.firmada).length
  const ultimaEval = [...datos.evaluaciones].sort((a, b) => b.anio - a.anio || b.trimestre - a.trimestre)[0]

  const pestanas = [
    { id: 'resumen', texto: 'Resumen' },
    ...(verTodo ? [
      { id: 'horario', texto: 'Horario' },
      { id: 'vacaciones', texto: 'Vacaciones', contador: datos.vacaciones.filter((v) => v.estado === 'pendiente').length || undefined },
      { id: 'inicio', texto: 'Check de inicio', contador: datos.tareas.length - hechas || undefined },
      { id: 'evaluaciones', texto: 'Evaluaciones', contador: datos.evaluaciones.length },
      { id: 'nominas', texto: 'Nóminas', contador: pendientesFirma || undefined },
    ] : []),
  ]

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 pt-2 pb-10 sm:px-6">
      <CabeceraFicha
        nombre={nombreCompleto(e)}
        foto={e.foto}
        etiquetas={
          <>
            {e.rol === 'admin' && <Etiqueta tono="morado">Administrador</Etiqueta>}
            {!e.activo && <Etiqueta tono="rojo">De baja</Etiqueta>}
            {verTodo && deVacacionesHoy(datos.vacaciones) && <Etiqueta tono="amarillo">De vacaciones</Etiqueta>}
          </>
        }
        subtitulo={<span className="flex flex-wrap items-center gap-2">{e.puesto}{e.departamento && <Etiqueta>{e.departamento}</Etiqueta>}</span>}
        acciones={
          <>
            <a href={`mailto:${e.correo}`} className="btn-secundario"><Icono nombre="correo" tamano={14} /> Email</a>
            {e.telefono && <a href={`tel:${e.telefono.replace(/\s/g, '')}`} className="btn-secundario"><Icono nombre="telefono" tamano={14} /> Llamar</a>}
            {esAdmin && <button type="button" className="btn-primario" onClick={() => setModal('editar')}><Icono nombre="lapiz" tamano={14} /> Editar ficha</button>}
          </>
        }
      >
        {verTodo && (
          <CifrasFicha cifras={[
            { etiqueta: 'Antigüedad', valor: edad(e.fecha_alta) },
            { etiqueta: 'Vacaciones disponibles', valor: `${saldo.disponibles} de ${saldo.total} días` },
            { etiqueta: 'Check de inicio', valor: hechas === datos.tareas.length ? <span className="text-emerald-600 dark:text-emerald-400">Completado</span> : <span className="text-amber-600 dark:text-amber-400">{hechas} de {datos.tareas.length}</span> },
            { etiqueta: 'Nota media', valor: media ? <span className="flex items-center gap-2">{media.toFixed(1)} <Estrellas nota={Math.round(media)} tamano={13} /></span> : '—' },
          ]} />
        )}
      </CabeceraFicha>

      <div className="-mx-4 sm:-mx-6">
        <Pestanas pestanas={pestanas} activa={pestana} onCambiar={setPestana} />
      </div>

      {pestana === 'resumen' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Seccion titulo="Datos" className="lg:col-span-1">
            <dl>
              <Dato etiqueta="Puesto">{e.puesto}</Dato>
              <Dato etiqueta="Departamento">{e.departamento ?? '—'}</Dato>
              <Dato etiqueta="Correo"><span className="break-all">{e.correo}</span></Dato>
              {verTodo && <Dato etiqueta="Correo personal">{e.correo_personal ?? '—'}</Dato>}
              <Dato etiqueta="Teléfono">{e.telefono ?? '—'}</Dato>
              <Dato etiqueta="Alta">{formatFecha(e.fecha_alta)}</Dato>
              <Dato etiqueta="Permisos">{e.rol === 'admin' ? 'Administrador' : 'Empleado'}</Dato>
              {verTodo && <Dato etiqueta="Vacaciones/año">{e.dias_vacaciones} días</Dato>}
            </dl>
          </Seccion>
          {verTodo ? (
            <div className="space-y-5 lg:col-span-2">
              {propio && <BotonFichar onFichado={recargar} />}
              <Seccion titulo="Check de inicio"><CheckInicio tareas={datos.tareas} onCambio={recargar} /></Seccion>
              <Seccion titulo="Última evaluación" acciones={<button type="button" className="btn-fantasma" onClick={() => setPestana('evaluaciones')}>Ver todas</button>}>
                {ultimaEval ? (
                  <div>
                    <div className="flex items-center gap-3"><Estrellas nota={ultimaEval.nota} /><span className="text-[12.5px] text-texto-3">{textoTrimestre(ultimaEval.anio, ultimaEval.trimestre)}</span></div>
                    <p className="mt-2 text-[13.5px] text-texto">{ultimaEval.comentario}</p>
                  </div>
                ) : <p className="text-[13px] text-texto-3">Aún no tiene evaluaciones.</p>}
              </Seccion>
            </div>
          ) : (
            <div className="lg:col-span-2">
              <Vacio icono="candado" titulo="Información privada" texto="Los horarios, vacaciones, evaluaciones y nóminas de cada trabajador solo los ven él mismo y los administradores." />
            </div>
          )}
        </div>
      )}

      {pestana === 'horario' && (
        <div className="space-y-5">
          {propio && <BotonFichar onFichado={recargar} />}
          <Seccion titulo="Fichajes de los últimos 60 días" sinPadding><ListaFichajes fichajes={datos.fichajes} /></Seccion>
        </div>
      )}

      {pestana === 'vacaciones' && (
        <Seccion
          titulo={`Vacaciones ${new Date().getFullYear()}: ${saldo.aprobados} disfrutados o aprobados · ${saldo.pendientes} pendientes · ${saldo.disponibles} disponibles`}
          acciones={propio && <button type="button" className="btn-primario" onClick={() => setModal('vacacion')}><Icono nombre="mas" tamano={14} /> Pedir vacaciones</button>}
          sinPadding
        >
          <ListaVacaciones vacaciones={datos.vacaciones} onCambio={recargar} />
        </Seccion>
      )}

      {pestana === 'inicio' && (
        <Seccion titulo="Tareas del primer día"><CheckInicio tareas={datos.tareas} onCambio={recargar} /></Seccion>
      )}

      {pestana === 'evaluaciones' && (
        <Seccion
          titulo="Evaluaciones trimestrales"
          acciones={esAdmin && !propio && (
            <button type="button" className="btn-primario" onClick={() => { setEvaluando(evalActual); setModal('evaluacion') }}>
              <Icono nombre="estrella" tamano={14} /> {evalActual ? `Editar ${textoTrimestre(anio, trimestre)}` : `Evaluar ${textoTrimestre(anio, trimestre)}`}
            </button>
          )}
          sinPadding
        >
          <ListaEvaluaciones evaluaciones={datos.evaluaciones} onEditar={esAdmin && !propio ? (x) => { setEvaluando(x); setModal('evaluacion') } : undefined} />
        </Seccion>
      )}

      {pestana === 'nominas' && (
        <Seccion titulo="Nóminas" acciones={esAdmin && <button type="button" className="btn-primario" onClick={() => setModal('nomina')}><Icono nombre="subir" tamano={14} /> Subir nómina</button>} sinPadding>
          <ListaNominas nominas={datos.nominas} onCambio={recargar} />
        </Seccion>
      )}

      <FormEmpleado abierto={modal === 'editar'} empleado={e} onCerrar={() => setModal(null)} onGuardado={() => recargar()} />
      <FormVacacion abierto={modal === 'vacacion'} disponibles={saldo.disponibles} onCerrar={() => setModal(null)} onGuardada={recargar} />
      <FormEvaluacion abierto={modal === 'evaluacion'} empleado={e} anio={evaluando?.anio ?? anio} trimestre={evaluando?.trimestre ?? trimestre} evaluacion={evaluando} onCerrar={() => setModal(null)} onGuardada={recargar} />
      <FormNomina abierto={modal === 'nomina'} idEmpleado={e.id_empleado} onCerrar={() => setModal(null)} onGuardada={recargar} />
    </div>
  )
}
