'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ESTADOS, ORIGENES, SELECT_OPORTUNIDAD, enlaceCliente, esAbierta, estadoInfo, MOTIVOS_DESCARTE, nombreCliente, origenTexto, probabilidadMedia, proximoPaso } from '@/lib/crm-utils'
import { cn, descargarCSV, diasHasta, errorLegible, formatDia, formatEUR, nombreCompleto, normalizar } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSeleccion } from '@/hooks/useSeleccion'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Estado, Oportunidad } from '@/types'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import BuscadorPastilla from '@/components/ui/BuscadorPastilla'
import Casilla from '@/components/ui/Casilla'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import BarraProbabilidad from '@/components/ui/BarraProbabilidad'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import Modal from '@/components/ui/Modal'
import Campo from '@/components/ui/Campo'
import PieTabla from '@/components/ui/PieTabla'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FilasCargando } from '@/components/ui/Cargando'
import FormOportunidad from '@/components/crm/FormOportunidad'
import TableroOportunidades from '@/components/crm/TableroOportunidades'

export default function OportunidadesPage() {
  const router = useRouter()
  const { empleado, esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const { empleados } = useCatalogos()
  const sel = useSeleccion()
  const [vista, setVista] = useState<'lista' | 'tablero'>('lista')
  const [pestana, setPestana] = useState('abiertas')
  const [orden, setOrden] = useState('reciente')
  const [responsable, setResponsable] = useState('todos')
  const [origen, setOrigen] = useState('todos')
  const [periodo, setPeriodo] = useState('todo')
  const [texto, setTexto] = useState('')
  const [editando, setEditando] = useState<Oportunidad | null | undefined>(undefined)
  const [descartando, setDescartando] = useState<{ o: Oportunidad; motivo: string } | null>(null)

  const { datos, setDatos, cargando, error, recargar } = useConsulta(async (sb) =>
    sinError(await sb.from('oportunidad').select(SELECT_OPORTUNIDAD).order('fecha_creacion', { ascending: false })) as Oportunidad[],
  )
  const todas = useMemo(() => datos ?? [], [datos])

  const filtradas = useMemo(() => {
    const q = normalizar(texto)
    return todas.filter((o) =>
      (responsable === 'todos' || (responsable === 'mias' ? o.id_responsable_fk === empleado?.id_empleado : responsable === 'nadie' ? !o.id_responsable_fk : o.id_responsable_fk === responsable)) &&
      (origen === 'todos' || o.origen === origen) &&
      (periodo === 'todo' || -diasHasta(o.fecha_creacion) <= Number(periodo)) &&
      (!q || normalizar(`${o.titulo} ${nombreCliente(o)} ${o.animal?.nombre ?? ''} ${o.servicio ?? ''}`).includes(q)),
    )
  }, [todas, responsable, origen, periodo, texto, empleado])

  const visibles = useMemo(() => {
    const r = filtradas.filter((o) =>
      pestana === 'todas' || (pestana === 'abiertas' ? esAbierta(o.estado) : o.estado === pestana),
    )
    const clave = (o: Oportunidad) => o.fecha_cita ?? o.fecha_seguimiento ?? '9999'
    const cmp: Record<string, (a: Oportunidad, b: Oportunidad) => number> = {
      reciente: (a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion),
      valor: (a, b) => b.valor - a.valor,
      probabilidad: (a, b) => b.probabilidad - a.probabilidad,
      proximo: (a, b) => clave(a).localeCompare(clave(b)),
    }
    return [...r].sort(cmp[orden])
  }, [filtradas, pestana, orden])

  const abiertas = todas.filter((o) => esAbierta(o.estado))
  useTituloPagina({
    titulo: 'Oportunidades',
    insignia: <Etiqueta punto>{abiertas.length} abiertas · {formatEUR(abiertas.reduce((s, o) => s + Number(o.valor), 0))}</Etiqueta>,
  }, [todas])

  async function mover(o: Oportunidad, estado: Estado, extra: { motivo_descarte?: string } = {}) {
    if (estado === 'descartado' && !extra.motivo_descarte) return setDescartando({ o, motivo: MOTIVOS_DESCARTE[0] })
    if (estado === 'cita' && !o.fecha_cita) return setEditando({ ...o, estado: 'cita' })
    const antes = datos
    setDatos((d) => d?.map((x) => (x.id_oportunidad === o.id_oportunidad ? { ...x, estado, probabilidad: estadoInfo(estado).probabilidad } : x)) ?? d)
    const { error: err } = await createClient().from('oportunidad').update({ estado, ...extra }).eq('id_oportunidad', o.id_oportunidad)
    if (err) { setDatos(antes); return aviso(errorLegible(err), 'error') }
    const anterior = { estado: o.estado, motivo_descarte: o.motivo_descarte }
    aviso(`«${o.titulo}» movida a ${estadoInfo(estado).texto}`, 'exito', {
      deshacer: async () => {
        const { error: e2 } = await createClient().from('oportunidad').update(anterior).eq('id_oportunidad', o.id_oportunidad)
        if (e2) return aviso(errorLegible(e2), 'error')
        aviso(`«${o.titulo}» vuelve a ${estadoInfo(anterior.estado).texto}`, 'info'); recargar()
      },
    })
    recargar()
  }

  async function eliminar(ids: string[]) {
    const una = ids.length === 1 ? datos?.find((o) => o.id_oportunidad === ids[0]) : undefined
    const ok = await confirmar({ titulo: una ? `¿Eliminar la oportunidad «${una.titulo}»?` : `¿Eliminar ${ids.length} oportunidades?`, texto: ids.length === 1 ? 'También se borrará su historial de llamadas y notas.' : 'También se borrará el historial de llamadas y notas de cada una.', boton: ids.length === 1 ? 'Eliminar oportunidad' : `Eliminar ${ids.length} oportunidades`, peligro: true })
    if (!ok) return
    const { error: err } = await createClient().from('oportunidad').delete().in('id_oportunidad', ids)
    if (err) return aviso(errorLegible(err), 'error')
    aviso(una ? `Oportunidad «${una.titulo}» eliminada` : `${ids.length} oportunidades eliminadas`)
    sel.limpiar()
    recargar()
  }

  const ids = visibles.map((o) => o.id_oportunidad)
  const todasMarcadas = ids.length > 0 && ids.every((id) => sel.marcadas.has(id))
  const valorTotal = visibles.reduce((s, o) => s + Number(o.valor), 0)
  const ponderado = visibles.reduce((s, o) => s + (Number(o.valor) * o.probabilidad) / 100, 0)

  return (
    <div className="flex h-full flex-col">
      <Pestanas activa={pestana} onCambiar={setPestana} pestanas={[
        { id: 'abiertas', texto: 'Abiertas', contador: filtradas.filter((o) => esAbierta(o.estado)).length },
        ...ESTADOS.map((e) => ({ id: e.id, texto: e.texto, contador: filtradas.filter((o) => o.estado === e.id).length })),
        { id: 'todas', texto: 'Todas', contador: filtradas.length },
      ]} />
      <BarraFiltros
        filtros={
          <>
            <FiltroPastilla etiqueta="Ordenar" valor={orden} onChange={setOrden} opciones={[
              { valor: 'reciente', texto: 'Más recientes' }, { valor: 'proximo', texto: 'Próximo paso' },
              { valor: 'valor', texto: 'Valor' }, { valor: 'probabilidad', texto: 'Probabilidad' },
            ]} />
            <FiltroPastilla etiqueta="Responsable" valor={responsable} onChange={setResponsable} opciones={[
              { valor: 'todos', texto: 'Todos' }, ...(empleado ? [{ valor: 'mias', texto: 'Mías' }] : []), { valor: 'nadie', texto: 'Sin asignar' },
              ...empleados.map((e) => ({ valor: e.id_empleado, texto: nombreCompleto(e) })),
            ]} />
            <FiltroPastilla etiqueta="Origen" valor={origen} onChange={setOrigen} opciones={[{ valor: 'todos', texto: 'Todos' }, ...ORIGENES.map((o) => ({ valor: o.id, texto: o.texto }))]} />
            <FiltroPastilla etiqueta="Creadas" valor={periodo} onChange={setPeriodo} opciones={[
              { valor: 'todo', texto: 'Siempre' }, { valor: '7', texto: '7 días' }, { valor: '30', texto: '30 días' }, { valor: '90', texto: '90 días' },
            ]} />
            <BuscadorPastilla valor={texto} onChange={setTexto} ayuda="Título, cliente, animal…" />
          </>
        }
        acciones={
          <>
            <div className="inline-flex rounded-lg border border-borde bg-superficie">
              {(['lista', 'tablero'] as const).map((v) => (
                <button key={v} type="button" onClick={() => setVista(v)} title={v === 'lista' ? 'Lista' : 'Pipeline'} aria-label={v === 'lista' ? 'Ver como lista' : 'Ver como pipeline'}
                  className={cn('inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-[14px]', vista === v ? 'bg-activo text-texto' : 'text-texto-3 hover:text-texto')}>
                  <Icono nombre={v === 'lista' ? 'lista' : 'tablero'} tamano={15} /> <span className="hidden xl:inline">{v === 'lista' ? 'Lista' : 'Pipeline'}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn-secundario" onClick={() => descargarCSV('oportunidades', (sel.n ? visibles.filter((o) => sel.marcadas.has(o.id_oportunidad)) : visibles).map((o) => ({
              Titulo: o.titulo, Estado: estadoInfo(o.estado).texto, Cliente: nombreCliente(o), Animal: o.animal?.nombre ?? '', Servicio: o.servicio ?? '',
              Valor: o.valor, Probabilidad: o.probabilidad, Responsable: nombreCompleto(o.responsable), Origen: origenTexto(o.origen),
              Creada: formatDia(o.fecha_creacion), Cita: o.fecha_cita ?? '', Seguimiento: o.fecha_seguimiento ?? '',
            })))}><Icono nombre="exportar" tamano={14} /> Exportar{sel.n ? ` (${sel.n})` : ''}</button>
            <button type="button" className="btn-primario" onClick={() => setEditando(null)}><Icono nombre="mas" tamano={14} /> Crear oportunidad</button>
          </>
        }
      />

      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : vista === 'tablero' ? (
        <div className="min-h-0 flex-1 pt-2"><TableroOportunidades oportunidades={filtradas} onMover={(o, e) => mover(o, e)} /></div>
      ) : (
        <div className="@container min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-t border-borde">
          <table className="tabla">
            <thead>
              <tr>
                <th className="w-12 !pl-4 sm:!pl-6"><Casilla marcada={todasMarcadas} parcial={sel.n > 0 && !todasMarcadas} onChange={(v) => sel.todas(ids, v)} etiqueta="Seleccionar todas" /></th>
                <th className="w-full @min-[1000px]:w-auto">Oportunidad</th>
                <th className="hidden @min-[560px]:table-cell">Estado</th>
                <th className="hidden @min-[740px]:table-cell">Cliente</th>
                <th className="hidden @min-[1240px]:table-cell">Animal</th>
                <th className="hidden @min-[1240px]:table-cell">Responsable</th>
                <th className="hidden text-right @min-[560px]:table-cell">Valor</th>
                <th className="hidden @min-[1000px]:table-cell">Probabilidad</th>
                <th className="hidden @min-[860px]:table-cell">Próximo paso</th>
                <th className="w-14 text-center">Acción</th>
              </tr>
            </thead>
            {cargando && !datos ? <FilasCargando columnas={10} /> : (
              <tbody>
                {visibles.map((o) => {
                  const est = estadoInfo(o.estado)
                  const paso = proximoPaso(o)
                  const enlace = enlaceCliente(o)
                  return (
                    <tr key={o.id_oportunidad} data-seleccionada={sel.marcadas.has(o.id_oportunidad)} className="cursor-pointer" onClick={() => router.push(`/oportunidades/${o.id_oportunidad}`)}>
                      <td className="!pl-4 sm:!pl-6"><Casilla marcada={sel.marcadas.has(o.id_oportunidad)} onChange={() => sel.alternar(o.id_oportunidad)} /></td>
                      <td className="max-w-0 min-w-[160px]">
                        <p className="max-w-[340px] truncate font-medium text-texto">{o.titulo}</p>
                        <p className="max-w-[340px] truncate text-[12.5px] text-texto-3">{o.servicio ?? 'Sin servicio'} · {origenTexto(o.origen)}</p>
                      </td>
                      <td className="hidden @min-[560px]:table-cell"><Etiqueta tono={est.tono}>{est.texto}</Etiqueta></td>
                      <td className="hidden @min-[740px]:table-cell">
                        {enlace ? (
                          <Link href={enlace} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 hover:underline">
                            <Avatar nombre={nombreCliente(o)} foto={o.empresa?.logo} cuadrado={!!o.empresa} />
                            <span className="max-w-[160px] truncate">{nombreCliente(o)}</span>
                          </Link>
                        ) : <span className="text-texto-3">{nombreCliente(o)}</span>}
                      </td>
                      <td className="hidden text-texto-2 @min-[1240px]:table-cell">{o.animal ? o.animal.nombre : '—'}</td>
                      <td className="hidden @min-[1240px]:table-cell">
                        {o.responsable ? (
                          <span className="flex items-center gap-2"><Avatar nombre={nombreCompleto(o.responsable)} foto={o.responsable.foto} /><span className="text-texto-2">{o.responsable.nombre}</span></span>
                        ) : <span className="text-texto-3">Sin asignar</span>}
                      </td>
                      <td className="hidden text-right tabular-nums @min-[560px]:table-cell">{formatEUR(o.valor)}</td>
                      <td className="hidden @min-[1000px]:table-cell"><BarraProbabilidad valor={o.probabilidad} /></td>
                      <td className="hidden @min-[860px]:table-cell">
                        {paso ? (
                          <span className={cn('flex items-center gap-2', paso.vencido ? 'text-rose-700 dark:text-rose-400' : 'text-texto')}>
                            <Icono nombre={paso.tipo === 'cita' ? 'calendario' : 'reloj'} tamano={14} className={paso.vencido ? '' : 'text-texto-3'} />
                            <span title={paso.tipo === 'cita' ? 'Cita' : 'Seguimiento'}>{paso.texto}</span>{paso.vencido && <span className="text-[12px]">· descartado</span>}
                          </span>
                        ) : <span className="block max-w-[170px] truncate text-texto-3">{o.estado === 'atendido' ? 'Terminada' : o.estado === 'descartado' ? o.motivo_descarte ?? '—' : 'Sin programar'}</span>}
                      </td>
                      <td className="text-center">
                        <Menu opciones={[
                          { texto: 'Abrir', icono: 'ojo', href: `/oportunidades/${o.id_oportunidad}` },
                          { texto: 'Editar', icono: 'lapiz', onClick: () => setEditando(o) },
                          { texto: 'Eliminar', icono: 'papelera', onClick: () => eliminar([o.id_oportunidad]), peligro: true, oculto: !esAdmin },
                        ]} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )}
          </table>
          {!cargando && visibles.length === 0 && <Vacio icono="oportunidad" titulo="No hay oportunidades aquí" texto="Quita los filtros para verlas todas, o crea una nueva."><button type="button" className="btn-secundario" onClick={() => { setPestana('todas'); setResponsable('todos'); setOrigen('todos'); setPeriodo('todo'); setTexto('') }}>Quitar filtros</button></Vacio>}
        </div>
      )}

      {vista === 'lista' && (
        <PieTabla items={[
          { valor: visibles.length, etiqueta: visibles.length === 1 ? 'oportunidad en vista' : 'oportunidades en vista' },
          { valor: formatEUR(valorTotal), etiqueta: 'valor total' },
          { valor: formatEUR(ponderado), etiqueta: 'previsto (según probabilidad)' },
          { valor: `${probabilidadMedia(visibles)} %`, etiqueta: 'probabilidad media' },
          ...(sel.n && esAdmin ? [{ valor: sel.n, etiqueta: sel.n === 1 ? 'seleccionada' : 'seleccionadas' }] : []),
        ]} />
      )}
      {sel.n > 0 && esAdmin && vista === 'lista' && (
        <div className="animar-subir fixed bottom-14 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-borde bg-superficie px-4 py-2 shadow-[var(--sombra)]">
          <span className="text-[13px]">{sel.n} {sel.n === 1 ? 'seleccionada' : 'seleccionadas'}</span>
          <button type="button" className="btn-peligro" onClick={() => eliminar([...sel.marcadas])}>Eliminar</button>
          <button type="button" className="btn-fantasma" onClick={sel.limpiar}>Cancelar</button>
        </div>
      )}

      <FormOportunidad abierto={editando !== undefined} oportunidad={editando} onCerrar={() => setEditando(undefined)}
        onGuardada={(id) => (editando ? recargar() : router.push(`/oportunidades/${id}`))} />

      <Modal abierto={!!descartando} onCerrar={() => setDescartando(null)} titulo="Descartar oportunidad" subtitulo={descartando?.o.titulo} ancho="sm"
        onSubmit={() => { if (descartando) { mover(descartando.o, 'descartado', { motivo_descarte: descartando.motivo }); setDescartando(null) } }}
        pie={<><button type="button" className="btn-secundario" onClick={() => setDescartando(null)}>Cancelar</button><button type="submit" className="btn-peligro">Descartar</button></>}>
        <div className="px-6 py-6">
          <Campo etiqueta="Motivo">
            <select className="input" value={descartando?.motivo ?? ''} onChange={(e) => setDescartando((d) => (d ? { ...d, motivo: e.target.value } : d))}>
              {MOTIVOS_DESCARTE.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Campo>
        </div>
      </Modal>
    </div>
  )
}
