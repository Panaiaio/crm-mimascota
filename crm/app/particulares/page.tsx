'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SELECT_ANIMALES_DE_PARTICULAR, animalesDe, esAbierta, estadoInfo, tonoDeTexto, ultimaInteraccion } from '@/lib/crm-utils'
import { descargarCSV, diasHasta, errorLegible, formatDia, formatEUR, nombreCompleto, normalizar } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSeleccion } from '@/hooks/useSeleccion'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Actividad, Oportunidad, Particular, ParticularBase } from '@/types'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import Casilla from '@/components/ui/Casilla'
import Avatar from '@/components/ui/Avatar'
import Etiqueta, { EtiquetaMas } from '@/components/ui/Etiqueta'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import PieTabla from '@/components/ui/PieTabla'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FilasCargando } from '@/components/ui/Cargando'
import FormParticular from '@/components/crm/FormParticular'
import FormOportunidad from '@/components/crm/FormOportunidad'

type Fila = Omit<Particular, 'oportunidad'> & {
  oportunidad: (Pick<Oportunidad, 'id_oportunidad' | 'estado' | 'valor' | 'fecha_creacion'> & { actividad: Pick<Actividad, 'tipo' | 'fecha'>[] })[]
}

export default function ParticularesPage() {
  const router = useRouter()
  const { esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const sel = useSeleccion()
  const [pestana, setPestana] = useState('todos')
  const [orden, setOrden] = useState('reciente')
  const [ciudad, setCiudad] = useState('todas')
  const [especie, setEspecie] = useState('todas')
  const [texto, setTexto] = useState('')
  const [editando, setEditando] = useState<ParticularBase | null | undefined>(undefined)
  const [nuevaOportunidad, setNuevaOportunidad] = useState<string | null>(null)

  const { datos, cargando, error, recargar } = useConsulta(async (sb) =>
    sinError(await sb.from('particular').select(`*, ${SELECT_ANIMALES_DE_PARTICULAR},
      oportunidad(id_oportunidad, estado, valor, fecha_creacion, actividad(tipo, fecha))`).order('nombre')) as Fila[],
  )

  const filas = useMemo(() => (datos ?? []).map((p) => {
    const ops = [...p.oportunidad].sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))
    const abiertas = ops.filter((o) => esAbierta(o.estado))
    return {
      ...p,
      animales: animalesDe(p),
      ultimaOp: ops[0] ?? null,
      abiertas: abiertas.length,
      valor: abiertas.reduce((s, o) => s + Number(o.valor), 0),
      ultima: ultimaInteraccion(ops.flatMap((o) => o.actividad)),
    }
  }), [datos])

  const ciudades = [...new Set(filas.map((f) => f.ciudad).filter(Boolean) as string[])].sort()
  const especies = [...new Set(filas.flatMap((f) => f.animales.map((a) => a.especie)))].sort()

  const visibles = useMemo(() => {
    const q = normalizar(texto)
    const r = filas.filter((f) =>
      (pestana === 'todos' || (pestana === 'abiertas' && f.abiertas > 0) || (pestana === 'nuevos' && -diasHasta(f.fecha_creacion) <= 30) || (pestana === 'sin' && !f.oportunidad.length)) &&
      (ciudad === 'todas' || f.ciudad === ciudad) &&
      (especie === 'todas' || f.animales.some((a) => a.especie === especie)) &&
      (!q || normalizar(`${nombreCompleto(f)} ${f.correo} ${f.telefono} ${f.animales.map((a) => a.nombre).join(' ')}`).includes(q)),
    )
    const cmp: Record<string, (a: typeof r[0], b: typeof r[0]) => number> = {
      reciente: (a, b) => (b.ultima?.fecha ?? b.fecha_creacion).localeCompare(a.ultima?.fecha ?? a.fecha_creacion),
      nombre: (a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b)),
      valor: (a, b) => b.valor - a.valor,
      alta: (a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion),
    }
    return [...r].sort(cmp[orden])
  }, [filas, pestana, ciudad, especie, texto, orden])

  useTituloPagina({
    titulo: 'Particulares',
    insignia: <Etiqueta punto tono="azul">{filas.reduce((s, f) => s + f.animales.length, 0)} animales</Etiqueta>,
  }, [filas])

  const ids = visibles.map((f) => f.id_particular)
  const todasMarcadas = ids.length > 0 && ids.every((id) => sel.marcadas.has(id))

  function exportar() {
    const lista = sel.n ? visibles.filter((f) => sel.marcadas.has(f.id_particular)) : visibles
    descargarCSV('particulares', lista.map((f) => ({
      Nombre: nombreCompleto(f), Telefono: f.telefono ?? '', Correo: f.correo ?? '', Ciudad: f.ciudad ?? '',
      Animales: f.animales.map((a) => `${a.nombre} (${a.especie})`).join(', '), 'Oportunidades abiertas': f.abiertas,
      'Valor en curso': f.valor, 'Ultimo estado': f.ultimaOp ? estadoInfo(f.ultimaOp.estado).texto : '',
    })))
  }

  async function eliminar(f: Fila) {
    const ok = await confirmar({ titulo: `¿Eliminar a ${nombreCompleto(f)}?`, texto: 'Sus animales y sus oportunidades se conservan.', boton: 'Eliminar', peligro: true })
    if (!ok) return
    const { error: err } = await createClient().from('particular').delete().eq('id_particular', f.id_particular)
    if (err) return aviso(errorLegible(err), 'error')
    aviso('Particular eliminado')
    recargar()
  }

  return (
    <div className="flex h-full flex-col">
      <Pestanas activa={pestana} onCambiar={setPestana} pestanas={[
        { id: 'todos', texto: 'Todos', contador: filas.length },
        { id: 'abiertas', texto: 'Con oportunidad abierta', contador: filas.filter((f) => f.abiertas).length },
        { id: 'nuevos', texto: 'Nuevos este mes', contador: filas.filter((f) => -diasHasta(f.fecha_creacion) <= 30).length },
        { id: 'sin', texto: 'Sin oportunidades', contador: filas.filter((f) => !f.oportunidad.length).length },
      ]} />
      <BarraFiltros
        filtros={
          <>
            <FiltroPastilla etiqueta="Ordenar" valor={orden} onChange={setOrden} opciones={[
              { valor: 'reciente', texto: 'Última interacción' }, { valor: 'alta', texto: 'Fecha de alta' },
              { valor: 'valor', texto: 'Valor en curso' }, { valor: 'nombre', texto: 'Nombre' },
            ]} />
            <FiltroPastilla etiqueta="Ciudad" valor={ciudad} onChange={setCiudad} opciones={[{ valor: 'todas', texto: 'Todas' }, ...ciudades.map((c) => ({ valor: c, texto: c }))]} />
            <FiltroPastilla etiqueta="Animal" valor={especie} onChange={setEspecie} opciones={[{ valor: 'todas', texto: 'Todos' }, ...especies.map((e) => ({ valor: e, texto: e[0].toUpperCase() + e.slice(1) }))]} />
            <label className="pastilla w-48 items-center gap-2 px-2.5">
              <Icono nombre="buscar" tamano={14} className="shrink-0 text-texto-3" />
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre, teléfono, animal…" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-texto-3" />
            </label>
          </>
        }
        acciones={
          <>
            <button type="button" className="btn-secundario" onClick={exportar}><Icono nombre="exportar" tamano={14} /> Exportar{sel.n ? ` (${sel.n})` : ''}</button>
            <button type="button" className="btn-primario" onClick={() => setEditando(null)}><Icono nombre="mas" tamano={14} /> Nuevo particular</button>
          </>
        }
      />

      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : (
        <div className="min-h-0 flex-1 overflow-auto border-t border-borde">
          <table className="tabla min-w-[1040px]">
            <thead>
              <tr>
                <th className="w-12 !pl-4 sm:!pl-6"><Casilla marcada={todasMarcadas} parcial={sel.n > 0 && !todasMarcadas} onChange={(v) => sel.todas(ids, v)} etiqueta="Seleccionar todos" /></th>
                <th>Persona</th>
                <th>Animales</th>
                <th>Teléfono</th>
                <th>Ciudad</th>
                <th>Última oportunidad</th>
                <th className="text-right">Valor en curso</th>
                <th>Última interacción</th>
                <th className="w-14 text-center">Acción</th>
              </tr>
            </thead>
            {cargando && !datos ? <FilasCargando columnas={9} /> : (
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id_particular} data-seleccionada={sel.marcadas.has(f.id_particular)} className="cursor-pointer" onClick={() => router.push(`/particulares/${f.id_particular}`)}>
                    <td className="!pl-4 sm:!pl-6"><Casilla marcada={sel.marcadas.has(f.id_particular)} onChange={() => sel.alternar(f.id_particular)} /></td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={nombreCompleto(f)} tamano="md" />
                        <div className="min-w-0 leading-tight">
                          <p className="font-medium text-texto">{nombreCompleto(f)}</p>
                          <p className="text-[12.5px] text-texto-3">{f.correo ?? 'Sin correo'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        {f.animales.slice(0, 2).map((a) => <Etiqueta key={a.id_animal} tono={tonoDeTexto(a.especie)} title={a.especie}>{a.nombre}</Etiqueta>)}
                        <EtiquetaMas n={f.animales.length - 2} title={f.animales.slice(2).map((a) => a.nombre).join(', ')} />
                        {!f.animales.length && <span className="text-texto-3">—</span>}
                      </div>
                    </td>
                    <td className="tabular-nums text-texto-2">{f.telefono ?? '—'}</td>
                    <td className="text-texto-2">{f.ciudad ?? '—'}</td>
                    <td>{f.ultimaOp ? <Etiqueta punto tono={estadoInfo(f.ultimaOp.estado).tono}>{estadoInfo(f.ultimaOp.estado).texto}</Etiqueta> : <span className="text-texto-3">Ninguna</span>}</td>
                    <td className="text-right tabular-nums">{f.valor ? formatEUR(f.valor) : <span className="text-texto-3">—</span>}</td>
                    <td>
                      {f.ultima ? (
                        <span className="flex items-center gap-1.5">
                          <Icono nombre="calendario" tamano={14} className="text-texto-3" />
                          {formatDia(f.ultima.fecha)}<span className="mx-1 h-3.5 w-px bg-borde" /><span className="text-texto-2">{f.ultima.texto}</span>
                        </span>
                      ) : <span className="text-texto-3">—</span>}
                    </td>
                    <td className="text-center">
                      <Menu opciones={[
                        { texto: 'Ver ficha', icono: 'ojo', href: `/particulares/${f.id_particular}` },
                        { texto: 'Nueva oportunidad', icono: 'mas', onClick: () => setNuevaOportunidad(f.id_particular) },
                        { texto: 'Editar', icono: 'lapiz', onClick: () => setEditando(f) },
                        { texto: 'Eliminar', icono: 'papelera', onClick: () => eliminar(f), peligro: true, oculto: !esAdmin },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!cargando && visibles.length === 0 && <Vacio icono="particular" titulo="Nadie con estos filtros" texto="Prueba a cambiar los filtros o crea un particular nuevo." />}
        </div>
      )}

      <PieTabla items={[
        { valor: visibles.length, etiqueta: visibles.length === 1 ? 'particular en vista' : 'particulares en vista' },
        { valor: visibles.reduce((s, f) => s + f.animales.length, 0), etiqueta: 'animales' },
        { valor: formatEUR(visibles.reduce((s, f) => s + f.valor, 0)), etiqueta: 'en curso' },
        ...(sel.n ? [{ valor: sel.n, etiqueta: sel.n === 1 ? 'seleccionado' : 'seleccionados' }] : []),
      ]} />

      <FormParticular abierto={editando !== undefined} particular={editando} onCerrar={() => setEditando(undefined)} onGuardado={(id) => (editando ? recargar() : router.push(`/particulares/${id}`))} />
      <FormOportunidad abierto={!!nuevaOportunidad} onCerrar={() => setNuevaOportunidad(null)} inicial={nuevaOportunidad ? { id_particular_fk: nuevaOportunidad } : undefined} onGuardada={(id) => router.push(`/oportunidades/${id}`)} />
    </div>
  )
}
