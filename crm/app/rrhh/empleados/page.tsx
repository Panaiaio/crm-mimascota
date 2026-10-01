'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deVacacionesHoy, textoTrimestre } from '@/lib/rrhh-utils'
import { cn, descargarCSV, formatDia, formatHora, nombreCompleto, normalizar } from '@/lib/utils'
import { tonoDeTexto } from '@/lib/crm-utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Empleado, Evaluacion, Fichaje, TareaInicio, Vacacion } from '@/types'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import Estrellas from '@/components/ui/Estrellas'
import BarraProgreso from '@/components/ui/BarraProgreso'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import PieTabla from '@/components/ui/PieTabla'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FilasCargando } from '@/components/ui/Cargando'
import FormEmpleado from '@/components/rrhh/FormEmpleado'

type Fila = Empleado & {
  tarea_inicio: Pick<TareaInicio, 'completada'>[]
  evaluacion: Pick<Evaluacion, 'nota' | 'anio' | 'trimestre'>[]
  fichaje: Pick<Fichaje, 'entrada' | 'salida'>[]
  vacacion: Pick<Vacacion, 'estado' | 'fecha_inicio' | 'fecha_fin'>[]
}

export default function EmpleadosPage() {
  const router = useRouter()
  const { esAdmin } = useSesion()
  const [pestana, setPestana] = useState('activos')
  const [departamento, setDepartamento] = useState('todos')
  const [orden, setOrden] = useState('nombre')
  const [texto, setTexto] = useState('')
  const [editando, setEditando] = useState<Empleado | null | undefined>(undefined)

  // Los fichajes, tareas, vacaciones y evaluaciones de los demás solo los ve un administrador (RLS)
  const { datos, cargando, error, recargar } = useConsulta(async (sb) => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    return sinError(await sb.from('empleado').select(`*,
      tarea_inicio!id_empleado_fk(completada),
      evaluacion!id_empleado_fk(nota, anio, trimestre),
      fichaje(entrada, salida),
      vacacion!id_empleado_fk(estado, fecha_inicio, fecha_fin)`)
      .gte('fichaje.entrada', hoy.toISOString()).order('nombre')) as Fila[]
  })

  const filas = useMemo(() => (datos ?? []).map((e) => {
    const abierto = e.fichaje.find((f) => !f.salida)
    const ultimaEval = [...e.evaluacion].sort((a, b) => b.anio - a.anio || b.trimestre - a.trimestre)[0]
    const estado = !e.activo ? { texto: 'De baja', tono: 'gris' as const }
      : deVacacionesHoy(e.vacacion) ? { texto: 'De vacaciones', tono: 'amarillo' as const }
      : abierto ? { texto: `Trabajando · ${formatHora(abierto.entrada)}`, tono: 'verde' as const }
      : e.fichaje.length ? { texto: 'Ha salido', tono: 'gris' as const }
      : { texto: 'Sin fichar', tono: 'gris' as const }
    return { ...e, estado, ultimaEval, hechas: e.tarea_inicio.filter((t) => t.completada).length }
  }), [datos])

  const departamentos = [...new Set(filas.map((f) => f.departamento).filter(Boolean) as string[])].sort()

  const visibles = useMemo(() => {
    const q = normalizar(texto)
    const r = filas.filter((f) =>
      (pestana === 'todos' || (pestana === 'activos' ? f.activo : pestana === 'incorporacion' ? f.activo && f.hechas < f.tarea_inicio.length : pestana === 'admin' ? f.rol === 'admin' : !f.activo)) &&
      (departamento === 'todos' || f.departamento === departamento) &&
      (!q || normalizar(`${nombreCompleto(f)} ${f.puesto} ${f.correo}`).includes(q)),
    )
    const cmp: Record<string, (a: typeof r[0], b: typeof r[0]) => number> = {
      nombre: (a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b)),
      alta: (a, b) => b.fecha_alta.localeCompare(a.fecha_alta),
      nota: (a, b) => (b.ultimaEval?.nota ?? 0) - (a.ultimaEval?.nota ?? 0),
    }
    return [...r].sort(cmp[orden])
  }, [filas, pestana, departamento, texto, orden])

  const trabajando = filas.filter((f) => f.estado.tono === 'verde').length
  useTituloPagina({ titulo: 'Empleados', insignia: esAdmin ? <Etiqueta punto tono="verde">{trabajando} trabajando ahora</Etiqueta> : undefined }, [trabajando, esAdmin])

  return (
    <div className="flex h-full flex-col">
      <Pestanas activa={pestana} onCambiar={setPestana} pestanas={[
        { id: 'activos', texto: 'En plantilla', contador: filas.filter((f) => f.activo).length },
        ...(esAdmin ? [{ id: 'incorporacion', texto: 'Incorporándose', contador: filas.filter((f) => f.activo && f.hechas < f.tarea_inicio.length).length }] : []),
        { id: 'admin', texto: 'Administradores', contador: filas.filter((f) => f.rol === 'admin').length },
        { id: 'baja', texto: 'De baja', contador: filas.filter((f) => !f.activo).length },
      ]} />
      <BarraFiltros
        filtros={
          <>
            <FiltroPastilla etiqueta="Ordenar" valor={orden} onChange={setOrden} opciones={[{ valor: 'nombre', texto: 'Nombre' }, { valor: 'alta', texto: 'Más recientes' }, ...(esAdmin ? [{ valor: 'nota', texto: 'Última nota' }] : [])]} />
            <FiltroPastilla etiqueta="Departamento" valor={departamento} onChange={setDepartamento} opciones={[{ valor: 'todos', texto: 'Todos' }, ...departamentos.map((d) => ({ valor: d, texto: d }))]} />
            <label className="pastilla w-44 items-center gap-2 px-2.5">
              <Icono nombre="buscar" tamano={14} className="shrink-0 text-texto-3" />
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre, puesto…" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-texto-3" />
            </label>
          </>
        }
        acciones={
          <>
            <button type="button" className="btn-secundario" onClick={() => descargarCSV('empleados', visibles.map((f) => ({
              Nombre: nombreCompleto(f), Puesto: f.puesto, Departamento: f.departamento ?? '', Correo: f.correo, Telefono: f.telefono ?? '',
              Alta: f.fecha_alta, Rol: f.rol === 'admin' ? 'Administrador' : 'Empleado',
            })))}><Icono nombre="exportar" tamano={14} /> Exportar</button>
            {esAdmin && <button type="button" className="btn-primario" onClick={() => setEditando(null)}><Icono nombre="mas" tamano={14} /> Nuevo empleado</button>}
          </>
        }
      />
      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : (
        <div className="min-h-0 flex-1 overflow-auto border-t border-borde">
          <table className="tabla min-w-[1000px]">
            <thead>
              <tr>
                <th className="!pl-4 sm:!pl-6">Empleado</th>
                <th>Puesto y departamento</th>
                <th>Alta</th>
                {esAdmin && <th>Hoy</th>}
                {esAdmin && <th>Check de inicio</th>}
                {esAdmin && <th>Última evaluación</th>}
                <th className="w-14 text-center">Acción</th>
              </tr>
            </thead>
            {cargando && !datos ? <FilasCargando columnas={esAdmin ? 7 : 4} /> : (
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id_empleado} className={cn('cursor-pointer', !f.activo && 'opacity-60')} onClick={() => router.push(`/rrhh/empleados/${f.id_empleado}`)}>
                    <td className="!pl-4 sm:!pl-6">
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={nombreCompleto(f)} foto={f.foto} tamano="md" />
                        <div className="leading-tight">
                          <p className="flex items-center gap-2 font-medium text-texto">{nombreCompleto(f)} {f.rol === 'admin' && <Etiqueta tono="morado" className="h-5 px-1.5 text-[11px]">Admin</Etiqueta>}</p>
                          <p className="text-[12.5px] text-texto-3">{f.correo}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <Etiqueta tono="gris">{f.puesto}</Etiqueta>
                        {f.departamento && <Etiqueta tono={tonoDeTexto(f.departamento)}>{f.departamento}</Etiqueta>}
                      </div>
                    </td>
                    <td className="text-texto-2">{formatDia(f.fecha_alta)}</td>
                    {esAdmin && <td><Etiqueta punto tono={f.estado.tono}>{f.estado.texto}</Etiqueta></td>}
                    {esAdmin && <td><BarraProgreso hechas={f.hechas} total={f.tarea_inicio.length} /></td>}
                    {esAdmin && (
                      <td>
                        {f.ultimaEval ? (
                          <span className="flex items-center gap-2"><Estrellas nota={f.ultimaEval.nota} tamano={13} /><span className="text-[12.5px] text-texto-3">{textoTrimestre(f.ultimaEval.anio, f.ultimaEval.trimestre)}</span></span>
                        ) : <span className="text-texto-3">Sin evaluar</span>}
                      </td>
                    )}
                    <td className="text-center">
                      <Menu opciones={[
                        { texto: 'Ver ficha', icono: 'ojo', href: `/rrhh/empleados/${f.id_empleado}` },
                        { texto: 'Editar', icono: 'lapiz', onClick: () => setEditando(f), oculto: !esAdmin },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!cargando && visibles.length === 0 && <Vacio icono="equipo" titulo="Nadie en esta lista" />}
        </div>
      )}
      <PieTabla items={[
        { valor: visibles.length, etiqueta: visibles.length === 1 ? 'empleado en vista' : 'empleados en vista' },
        ...(esAdmin ? [{ valor: trabajando, etiqueta: 'trabajando ahora' }, { valor: filas.filter((f) => f.activo && f.hechas < f.tarea_inicio.length).length, etiqueta: 'con el check de inicio pendiente' }] : []),
      ]} />
      <FormEmpleado abierto={editando !== undefined} empleado={editando} onCerrar={() => setEditando(undefined)} onGuardado={(id) => (editando ? recargar() : router.push(`/rrhh/empleados/${id}`))} />
    </div>
  )
}
