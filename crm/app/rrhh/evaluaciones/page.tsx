'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { textoTrimestre, trimestreActual } from '@/lib/rrhh-utils'
import { nombreCompleto } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { EmpleadoBreve, Evaluacion } from '@/types'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import Seccion, { Cifra } from '@/components/ui/Seccion'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import Estrellas from '@/components/ui/Estrellas'
import Icono from '@/components/ui/Icono'
import PieTabla from '@/components/ui/PieTabla'
import { ErrorCarga, BloqueCargando, FilasCargando } from '@/components/ui/Cargando'
import ListaEvaluaciones from '@/components/rrhh/ListaEvaluaciones'
import FormEvaluacion from '@/components/rrhh/FormEvaluacion'

type EmpleadoEval = EmpleadoBreve & { puesto: string; evaluacion: Evaluacion[] }

export default function EvaluacionesPage() {
  const { empleado, esAdmin } = useSesion()
  const actual = trimestreActual()
  const [periodo, setPeriodo] = useState(`${actual.anio}-${actual.trimestre}`)
  const [pestana, setPestana] = useState('trimestre')
  const [evaluando, setEvaluando] = useState<{ e: EmpleadoEval; ev: Evaluacion | null } | null>(null)
  const [anio, trimestre] = periodo.split('-').map(Number)

  useTituloPagina({ titulo: 'Evaluaciones' })

  const { datos, cargando, error, recargar } = useConsulta(async (sb) => {
    if (esAdmin) {
      return sinError(await sb.from('empleado').select('id_empleado, nombre, apellidos, foto, puesto, evaluacion!id_empleado_fk(*, evaluador:empleado!id_evaluador_fk(id_empleado, nombre, apellidos, foto))')
        .eq('activo', true).neq('id_empleado', empleado?.id_empleado ?? '').order('nombre')) as EmpleadoEval[]
    }
    if (!empleado) return []
    const mias = sinError(await sb.from('evaluacion').select('*, evaluador:empleado!id_evaluador_fk(id_empleado, nombre, apellidos, foto)').eq('id_empleado_fk', empleado.id_empleado)) as Evaluacion[]
    return [{ ...empleado, evaluacion: mias }] as EmpleadoEval[]
  }, [esAdmin, empleado?.id_empleado])

  // Los últimos 6 trimestres para elegir
  const trimestres = useMemo(() => {
    const r: { valor: string; texto: string }[] = []
    let a = actual.anio, t = actual.trimestre
    for (let i = 0; i < 6; i++) {
      r.push({ valor: `${a}-${t}`, texto: textoTrimestre(a, t) + (i === 0 ? ' (actual)' : '') })
      t--; if (!t) { t = 4; a-- }
    }
    return r
  }, [actual.anio, actual.trimestre])

  if (!esAdmin) {
    const mias = datos?.[0]?.evaluacion ?? []
    const media = mias.length ? mias.reduce((s, x) => s + x.nota, 0) / mias.length : 0
    return (
      <div className="mx-auto max-w-4xl space-y-5 px-4 pt-2 pb-10 sm:px-6">
        {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : cargando && !datos ? <BloqueCargando alto={300} /> : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Cifra etiqueta="Evaluaciones" valor={mias.length} />
              <Cifra etiqueta="Nota media" valor={media ? media.toFixed(1) : '—'} tono={media >= 4 ? 'verde' : media >= 3 ? 'amarillo' : media ? 'rojo' : undefined} />
              <Cifra etiqueta="Trimestre actual" valor={mias.some((x) => x.anio === actual.anio && x.trimestre === actual.trimestre) ? 'Evaluado' : 'Pendiente'} />
            </div>
            <Seccion titulo="Mis evaluaciones" sinPadding><ListaEvaluaciones evaluaciones={mias} /></Seccion>
          </>
        )}
      </div>
    )
  }

  const lista = datos ?? []
  const delPeriodo = lista.map((e) => ({ e, ev: e.evaluacion.find((x) => x.anio === anio && x.trimestre === trimestre) ?? null }))
  const hechas = delPeriodo.filter((x) => x.ev)
  const mediaPeriodo = hechas.length ? hechas.reduce((s, x) => s + (x.ev?.nota ?? 0), 0) / hechas.length : 0
  const todas = lista.flatMap((e) => e.evaluacion.map((ev) => ({ ...ev, empleado: e })))

  return (
    <div className="flex h-full flex-col">
      <Pestanas activa={pestana} onCambiar={setPestana} pestanas={[
        { id: 'trimestre', texto: 'Por trimestre' },
        { id: 'historial', texto: 'Historial', contador: todas.length },
      ]} />
      {pestana === 'trimestre' && (
        <BarraFiltros filtros={<FiltroPastilla etiqueta="Trimestre" valor={periodo} onChange={setPeriodo} opciones={trimestres} />}
          acciones={<Etiqueta punto tono={hechas.length === lista.length ? 'verde' : 'amarillo'}>{hechas.length} de {lista.length} evaluados</Etiqueta>} />
      )}
      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : pestana === 'trimestre' ? (
        <div className="min-h-0 flex-1 overflow-auto border-t border-borde">
          <table className="tabla min-w-[860px]">
            <thead>
              <tr><th className="!pl-4 sm:!pl-6">Empleado</th><th>Nota {textoTrimestre(anio, trimestre)}</th><th>Comentario</th><th>Media histórica</th><th className="w-40 text-right">Acción</th></tr>
            </thead>
            {cargando && !datos ? <FilasCargando columnas={5} /> : (
              <tbody>
                {delPeriodo.map(({ e, ev }) => {
                  const media = e.evaluacion.length ? e.evaluacion.reduce((s, x) => s + x.nota, 0) / e.evaluacion.length : 0
                  return (
                    <tr key={e.id_empleado}>
                      <td className="!pl-4 sm:!pl-6">
                        <Link href={`/rrhh/empleados/${e.id_empleado}`} className="flex items-center gap-2.5">
                          <Avatar nombre={nombreCompleto(e)} foto={e.foto} tamano="md" />
                          <div className="leading-tight"><p className="font-medium hover:underline">{nombreCompleto(e)}</p><p className="text-[12.5px] text-texto-3">{e.puesto}</p></div>
                        </Link>
                      </td>
                      <td>{ev ? <Estrellas nota={ev.nota} /> : <Etiqueta tono="amarillo">Pendiente</Etiqueta>}</td>
                      <td className="max-w-[340px] truncate text-texto-2" title={ev?.comentario}>{ev?.comentario ?? '—'}</td>
                      <td>{media ? <span className="flex items-center gap-2 tabular-nums">{media.toFixed(1)} <Estrellas nota={Math.round(media)} tamano={12} /></span> : <span className="text-texto-3">—</span>}</td>
                      <td className="text-right">
                        <button type="button" className={ev ? 'btn-secundario' : 'btn-primario'} onClick={() => setEvaluando({ e, ev })}>
                          <Icono nombre={ev ? 'lapiz' : 'estrella'} tamano={14} /> {ev ? 'Editar' : 'Evaluar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )}
          </table>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-4 pb-10 sm:px-6">
          <Seccion sinPadding>
            <ul className="divide-y divide-borde-suave">
              {[...todas].sort((a, b) => b.anio - a.anio || b.trimestre - a.trimestre || nombreCompleto(a.empleado).localeCompare(nombreCompleto(b.empleado))).map((ev) => (
                <li key={ev.id_evaluacion} className="flex items-start gap-3 px-5 py-4">
                  <Avatar nombre={nombreCompleto(ev.empleado)} foto={ev.empleado.foto} tamano="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-medium">{nombreCompleto(ev.empleado)}</span>
                      <Estrellas nota={ev.nota} tamano={13} />
                      <span className="text-[12.5px] text-texto-3">{textoTrimestre(ev.anio, ev.trimestre)}</span>
                    </div>
                    <p className="mt-1 text-[13.5px] text-texto-2">{ev.comentario}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Seccion>
        </div>
      )}
      {pestana === 'trimestre' && (
        <PieTabla items={[
          { valor: `${hechas.length}/${lista.length}`, etiqueta: 'evaluados' },
          { valor: mediaPeriodo ? mediaPeriodo.toFixed(1) : '—', etiqueta: 'nota media del trimestre' },
        ]} />
      )}
      <FormEvaluacion abierto={!!evaluando} empleado={evaluando?.e ?? null} anio={anio} trimestre={trimestre} evaluacion={evaluando?.ev} onCerrar={() => setEvaluando(null)} onGuardada={recargar} />
    </div>
  )
}
