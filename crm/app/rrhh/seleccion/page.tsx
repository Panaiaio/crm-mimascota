'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { abrirPrivado } from '@/lib/archivos'
import { DEPARTAMENTOS, ESTADOS_CANDIDATO, estadoCandidatoInfo } from '@/lib/rrhh-utils'
import { cn, errorLegible, haceCuanto, hoyISO, nombreCompleto } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Candidato, EstadoCandidato, ProcesoSeleccion } from '@/types'
import { PUNTOS } from '@/components/ui/Etiqueta'
import Avatar from '@/components/ui/Avatar'
import Menu from '@/components/ui/Menu'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm } from '@/components/ui/Campo'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import { ErrorCarga, BloqueCargando } from '@/components/ui/Cargando'
import FormCandidato from '@/components/rrhh/FormCandidato'
import { correoCorporativo } from '@/components/rrhh/FormEmpleado'

type Proceso = ProcesoSeleccion & { candidato: Candidato[] }
type CandidatoConProceso = Candidato & { proceso: Proceso }

export default function SeleccionPage() {
  const router = useRouter()
  const { esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [filtro, setFiltro] = useState('todos')
  const [nuevoProceso, setNuevoProceso] = useState(false)
  const [proceso, setProceso] = useState({ puesto: '', departamento: '', descripcion: '' })
  const [errorProceso, setErrorProceso] = useState<string | null>(null)
  const [nuevoCandidato, setNuevoCandidato] = useState(false)
  const [contratando, setContratando] = useState<Candidato | null>(null)
  const [fechaAlta, setFechaAlta] = useState(hoyISO())
  const [arrastrando, setArrastrando] = useState<string | null>(null)


  const { datos, setDatos, cargando, error, recargar } = useConsulta(async (sb) =>
    esAdmin ? (sinError(await sb.from('proceso_seleccion').select('*, candidato(*)').order('estado').order('fecha_creacion', { ascending: false })) as Proceso[]) : [],
  [esAdmin])

  const procesos = useMemo(() => datos ?? [], [datos])
  const abiertos = procesos.filter((p) => p.estado === 'abierto')
  // Todos los candidatos de todos los procesos en un mismo tablero (o solo los del proceso filtrado)
  const candidatos: CandidatoConProceso[] = useMemo(() => procesos
    .filter((p) => filtro === 'todos' || p.id_proceso === filtro)
    .flatMap((p) => p.candidato.map((c) => ({ ...c, proceso: p }))), [procesos, filtro])

  useTituloPagina({
    titulo: 'Selección de personal',
    insignia: procesos.length ? <span className="text-[12.5px] text-texto-3">{abiertos.length} {abiertos.length === 1 ? 'proceso abierto' : 'procesos abiertos'} de {procesos.length}</span> : undefined,
  }, [abiertos.length, procesos.length])

  if (!esAdmin) return <Vacio icono="candado" titulo="Solo para administradores" texto="Los procesos de selección y los CV de los candidatos solo los ven los administradores." />

  async function crearProceso() {
    if (!proceso.puesto.trim()) return setErrorProceso('Indica el puesto')
    const { data, error: err } = await createClient().from('proceso_seleccion')
      .insert({ puesto: proceso.puesto.trim(), departamento: proceso.departamento.trim() || null, descripcion: proceso.descripcion.trim() || null })
      .select('id_proceso').single()
    if (err) return setErrorProceso(errorLegible(err))
    aviso('Proceso creado')
    setNuevoProceso(false)
    setProceso({ puesto: '', departamento: '', descripcion: '' })
    setFiltro(data.id_proceso)
    recargar()
  }

  async function cambiarEstadoProceso(p: Proceso) {
    const { error: err } = await createClient().from('proceso_seleccion').update({ estado: p.estado === 'abierto' ? 'cerrado' : 'abierto' }).eq('id_proceso', p.id_proceso)
    if (err) return aviso(errorLegible(err), 'error')
    aviso(p.estado === 'abierto' ? `Proceso "${p.puesto}" cerrado` : `Proceso "${p.puesto}" reabierto`)
    recargar()
  }

  async function mover(c: Candidato, estado: EstadoCandidato) {
    if (estado === 'contratado') return setContratando(c)
    if (c.estado === 'contratado') return aviso('Este candidato ya está contratado', 'error')
    setDatos((d) => d?.map((p) => ({ ...p, candidato: p.candidato.map((x) => (x.id_candidato === c.id_candidato ? { ...x, estado } : x)) })) ?? d)
    const { error: err } = await createClient().from('candidato').update({ estado }).eq('id_candidato', c.id_candidato)
    if (err) { aviso(errorLegible(err), 'error'); recargar() }
  }

  async function contratar() {
    if (!contratando) return
    const { data, error: err } = await createClient().rpc('contratar_candidato', { p_id_candidato: contratando.id_candidato, p_fecha_alta: fechaAlta })
    if (err) return aviso(errorLegible(err), 'error')
    setContratando(null)
    aviso(`${contratando.nombre} contratado. Ya tiene su ficha y su check de inicio.`)
    router.push(`/rrhh/empleados/${data}`)
  }

  async function borrarCandidato(c: Candidato) {
    if (!(await confirmar({ titulo: `¿Borrar a ${nombreCompleto(c)}?`, texto: 'Se borrará del proceso (su CV queda en el almacenamiento).', boton: 'Borrar', peligro: true }))) return
    const { error: err } = await createClient().from('candidato').delete().eq('id_candidato', c.id_candidato)
    if (err) return aviso(errorLegible(err), 'error')
    recargar()
  }

  const procesoDe = (c: Candidato) => procesos.find((p) => p.id_proceso === c.id_proceso_fk)
  const verCV = (c: Candidato) => c.cv ? abrirPrivado('cvs', c.cv).catch((e) => aviso(errorLegible(e), 'error')) : aviso('Este candidato no tiene CV subido', 'info')

  return (
    <div className="flex h-full flex-col">
      <BarraFiltros
        filtros={procesos.length > 1 ? (
          <FiltroPastilla etiqueta="Proceso" valor={filtro} onChange={setFiltro}
            opciones={[{ valor: 'todos', texto: 'Todos' }, ...procesos.map((p) => ({ valor: p.id_proceso, texto: p.estado === 'abierto' ? p.puesto : `${p.puesto} (cerrado)` }))]} />
        ) : undefined}
        acciones={
          <>
            {procesos.length > 0 && (
              <Menu etiqueta="Abrir o cerrar procesos" boton={<span className="btn-secundario"><Icono nombre="seleccion" tamano={14} /> Procesos</span>}
                opciones={procesos.map((p) => ({ texto: p.estado === 'abierto' ? `Cerrar "${p.puesto}"` : `Reabrir "${p.puesto}"`, icono: p.estado === 'abierto' ? 'candado' : 'check', onClick: () => cambiarEstadoProceso(p) }))} />
            )}
            <button type="button" className="btn-secundario" onClick={() => { setErrorProceso(null); setNuevoProceso(true) }}><Icono nombre="mas" tamano={14} /> Nuevo proceso</button>
            <button type="button" className="btn-primario" onClick={() => (abiertos.length ? setNuevoCandidato(true) : aviso('Primero crea o reabre un proceso de selección', 'info'))}><Icono nombre="mas" tamano={14} /> Añadir candidato</button>
          </>
        }
      />

      {/* Candidatos de todos los procesos en un mismo tablero */}
      <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 sm:px-6 xl:overflow-hidden">
        {cargando && !datos ? <BloqueCargando alto={300} /> : error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : !procesos.length ? (
          <Vacio icono="seleccion" titulo="Aún no hay procesos de selección" texto="Crea uno con el botón Nuevo proceso." />
        ) : (
            <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:min-h-0 xl:flex-1 xl:grid-cols-5 xl:content-stretch">
              {ESTADOS_CANDIDATO.map((e) => {
                const lista = candidatos.filter((c) => c.estado === e.id)
                return (
                  <div key={e.id}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={(ev) => { ev.preventDefault(); const c = candidatos.find((x) => x.id_candidato === ev.dataTransfer.getData('text/plain')); if (c && c.estado !== e.id) mover(c, e.id) }}
                    className="flex min-w-0 flex-col rounded-xl border border-borde bg-superficie-2 xl:min-h-0">
                    <div className="flex items-center gap-2 px-3 py-3">
                      <span className={cn('size-2 rounded-full', PUNTOS[e.tono])} />
                      <span className="truncate text-[13px] font-medium">{e.texto}</span>
                      <span className="ml-auto text-[12px] text-texto-3">{lista.length}</span>
                    </div>
                    <div className="min-h-0 flex-1 space-y-2 px-2 pb-2 xl:overflow-y-auto">
                      {lista.map((c) => (
                        <div key={c.id_candidato} draggable={c.estado !== 'contratado'}
                          onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', c.id_candidato); setArrastrando(c.id_candidato) }}
                          onDragEnd={() => setArrastrando(null)}
                          className={cn('rounded-lg border border-borde bg-superficie p-3', arrastrando === c.id_candidato && 'opacity-50', c.estado !== 'contratado' && 'cursor-grab')}>
                          <div className="flex items-start gap-2.5">
                            <Avatar nombre={nombreCompleto(c)} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] leading-snug font-medium break-words">{nombreCompleto(c)}</p>
                              <p className="truncate text-[12px] text-texto-3">{c.correo}</p>
                            </div>
                            <Menu opciones={[
                              { texto: 'Ver CV', icono: 'archivo', onClick: () => verCV(c) },
                              ...ESTADOS_CANDIDATO.filter((x) => x.id !== c.estado && c.estado !== 'contratado').map((x) => ({ texto: x.id === 'contratado' ? 'Contratar…' : `Mover a ${x.texto}`, onClick: () => mover(c, x.id) })),
                              { texto: 'Ver ficha de empleado', icono: 'particular', href: c.id_empleado_fk ? `/rrhh/empleados/${c.id_empleado_fk}` : undefined, oculto: !c.id_empleado_fk },
                              { texto: 'Borrar', icono: 'papelera', onClick: () => borrarCandidato(c), peligro: true, oculto: c.estado === 'contratado' },
                            ]} />
                          </div>
                          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-texto-2"><Icono nombre="seleccion" tamano={12} className="shrink-0 text-texto-3" /><span className="truncate">{c.proceso.puesto}{c.proceso.estado === 'cerrado' ? ' (cerrado)' : ''}</span></p>
                          {c.notas && <p className="mt-1.5 line-clamp-2 text-[12px] text-texto-2">{c.notas}</p>}
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-borde-suave pt-2 text-[12px]">
                            <button type="button" onClick={() => verCV(c)} className={cn('flex items-center gap-1', c.cv ? 'text-texto-2 hover:text-texto' : 'text-texto-3')}>
                              <Icono nombre="archivo" tamano={13} /> {c.cv ? 'CV (PDF)' : 'Sin CV'}
                            </button>
                            <span className="text-texto-3">{haceCuanto(c.fecha_creacion)}</span>
                          </div>
                          {c.estado === 'oferta' && <button type="button" className="btn-exito mt-2.5 w-full" onClick={() => setContratando(c)}><Icono nombre="check" tamano={14} /> Contratar</button>}
                        </div>
                      ))}
                      {!lista.length && <p className="px-2 py-5 text-center text-[12px] text-texto-3">Arrastra aquí</p>}
                    </div>
                  </div>
                )
              })}
            </div>
        )}
      </section>

      <Modal abierto={nuevoProceso} onCerrar={() => setNuevoProceso(false)} titulo="Nuevo proceso de selección" ancho="sm" onSubmit={crearProceso}
        pie={<><ErrorForm mensaje={errorProceso} /><button type="button" className="btn-secundario" onClick={() => setNuevoProceso(false)}>Cancelar</button><button type="submit" className="btn-primario">Crear proceso</button></>}>
        <div className="grid gap-4 px-6 py-5">
          <Campo etiqueta="Puesto" obligatorio><input className="input" value={proceso.puesto} onChange={(e) => setProceso((x) => ({ ...x, puesto: e.target.value }))} autoFocus placeholder="Auxiliar veterinario" /></Campo>
          <Campo etiqueta="Departamento">
            <input className="input" list="dep-proceso" value={proceso.departamento} onChange={(e) => setProceso((x) => ({ ...x, departamento: e.target.value }))} />
            <datalist id="dep-proceso">{DEPARTAMENTOS.map((d) => <option key={d} value={d} />)}</datalist>
          </Campo>
          <Campo etiqueta="Descripción"><textarea className="input" rows={3} value={proceso.descripcion} onChange={(e) => setProceso((x) => ({ ...x, descripcion: e.target.value }))} /></Campo>
        </div>
      </Modal>

      <Modal abierto={!!contratando} onCerrar={() => setContratando(null)} titulo={`Contratar a ${contratando ? nombreCompleto(contratando) : ''}`} ancho="sm" onSubmit={contratar}
        pie={<><button type="button" className="btn-secundario" onClick={() => setContratando(null)}>Cancelar</button><button type="submit" className="btn-exito"><Icono nombre="check" tamano={14} /> Contratar</button></>}>
        {contratando && procesoDe(contratando) && (
          <div className="space-y-4 px-6 py-5 text-[13.5px]">
            <p className="text-texto-2">Se creará automáticamente:</p>
            <ul className="space-y-2">
              <li className="flex gap-2"><Icono nombre="check" className="mt-0.5 text-emerald-500" /> Su ficha de empleado como <b>{procesoDe(contratando)?.puesto}</b></li>
              <li className="flex gap-2"><Icono nombre="check" className="mt-0.5 text-emerald-500" /> El correo corporativo <b>{correoCorporativo(contratando.nombre, contratando.apellidos ?? '')}</b></li>
              <li className="flex gap-2"><Icono nombre="check" className="mt-0.5 text-emerald-500" /> Las tareas del check de inicio (portátil, correo, uniforme…)</li>
            </ul>
            <Campo etiqueta="Fecha de alta"><input className="input" type="date" value={fechaAlta} onChange={(e) => setFechaAlta(e.target.value)} /></Campo>
            <p className="text-[12px] text-texto-3">Si ese correo ya existe se le añade un número (por ejemplo, nombre.apellido2@…).</p>
          </div>
        )}
      </Modal>

      <FormCandidato abierto={nuevoCandidato} onCerrar={() => setNuevoCandidato(false)} procesos={abiertos} idInicial={filtro !== 'todos' ? filtro : undefined} onGuardado={recargar} />
    </div>
  )
}
