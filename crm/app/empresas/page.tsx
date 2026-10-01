'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { actividadSemanal, esAbierta, probabilidadMedia, SECTORES, tipoClienteInfo, tonoDeTexto, ultimaInteraccion } from '@/lib/crm-utils'
import { descargarCSV, diasHasta, errorLegible, formatDia, formatEUR, nombreCompleto } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSeleccion } from '@/hooks/useSeleccion'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Actividad, Empresa, EmpresaBase, EmpleadoBreve, Oportunidad } from '@/types'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import Casilla from '@/components/ui/Casilla'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import BarraProbabilidad from '@/components/ui/BarraProbabilidad'
import MiniBarras from '@/components/ui/MiniBarras'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import PieTabla from '@/components/ui/PieTabla'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FilasCargando } from '@/components/ui/Cargando'
import FormEmpresa from '@/components/crm/FormEmpresa'
import FormOportunidad from '@/components/crm/FormOportunidad'

type Fila = Omit<Empresa, 'responsable' | 'animal' | 'oportunidad'> & {
  responsable: EmpleadoBreve | null
  animal: { id_animal: string }[]
  oportunidad: (Pick<Oportunidad, 'id_oportunidad' | 'estado' | 'valor' | 'probabilidad'> & { actividad: Pick<Actividad, 'tipo' | 'fecha'>[] })[]
}

const ORDEN = [
  { valor: 'valor', texto: 'Valor en curso' },
  { valor: 'probabilidad', texto: 'Probabilidad' },
  { valor: 'reciente', texto: 'Última interacción' },
  { valor: 'nombre', texto: 'Nombre' },
]
const PERIODOS = [
  { valor: 'todo', texto: 'Siempre' },
  { valor: '30', texto: '30 días' },
  { valor: '90', texto: '90 días' },
  { valor: '365', texto: '1 año' },
]

export default function EmpresasPage() {
  const router = useRouter()
  const { esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const { empleados } = useCatalogos()
  const sel = useSeleccion()

  const [pestana, setPestana] = useState('todas')
  const [orden, setOrden] = useState('valor')
  const [responsable, setResponsable] = useState('todos')
  const [sector, setSector] = useState('todos')
  const [periodo, setPeriodo] = useState('todo')
  const [editando, setEditando] = useState<EmpresaBase | null | undefined>(undefined)
  const [nuevaOportunidad, setNuevaOportunidad] = useState<string | null>(null)

  const { datos, cargando, error, recargar } = useConsulta(async (sb) =>
    sinError(await sb.from('empresa').select(`*,
      responsable:empleado(id_empleado, nombre, apellidos, foto),
      animal(id_animal),
      oportunidad(id_oportunidad, estado, valor, probabilidad, actividad(tipo, fecha))`).order('nombre')) as Fila[],
  )

  // Datos calculados de cada empresa
  const filas = useMemo(() => (datos ?? []).map((e) => {
    const abiertas = e.oportunidad.filter((o) => esAbierta(o.estado))
    const actividades = e.oportunidad.flatMap((o) => o.actividad)
    return {
      ...e,
      abiertas: abiertas.length,
      valor: abiertas.reduce((s, o) => s + Number(o.valor), 0),
      probabilidad: abiertas.length ? probabilidadMedia(abiertas) : null,
      tendencia: actividadSemanal(actividades.map((a) => a.fecha)),
      ultima: ultimaInteraccion(actividades),
    }
  }), [datos])

  const cuentas = {
    todas: filas.length,
    nuevo: filas.filter((f) => f.tipo_cliente === 'nuevo').length,
    habitual: filas.filter((f) => f.tipo_cliente === 'habitual').length,
    convenio: filas.filter((f) => f.tipo_cliente === 'convenio').length,
  }

  const visibles = useMemo(() => {
    const r = filas.filter((f) =>
      (pestana === 'todas' || f.tipo_cliente === pestana) &&
      (responsable === 'todos' || f.id_responsable_fk === responsable) &&
      (sector === 'todos' || f.sector === sector) &&
      (periodo === 'todo' || (f.ultima && -diasHasta(f.ultima.fecha) <= Number(periodo))),
    )
    const cmp: Record<string, (a: typeof r[0], b: typeof r[0]) => number> = {
      valor: (a, b) => b.valor - a.valor,
      probabilidad: (a, b) => (b.probabilidad ?? -1) - (a.probabilidad ?? -1),
      reciente: (a, b) => (b.ultima?.fecha ?? '').localeCompare(a.ultima?.fecha ?? ''),
      nombre: (a, b) => a.nombre.localeCompare(b.nombre),
    }
    return [...r].sort(cmp[orden])
  }, [filas, pestana, responsable, sector, periodo, orden])

  useTituloPagina({
    titulo: 'Empresas',
    insignia: <Etiqueta punto tono="verde">{filas.filter((f) => f.abiertas).length} con oportunidades abiertas</Etiqueta>,
  }, [filas])

  const totalValor = visibles.reduce((s, f) => s + f.valor, 0)
  const conProb = visibles.filter((f) => f.probabilidad != null)
  const probMedia = conProb.length ? Math.round(conProb.reduce((s, f) => s + (f.probabilidad ?? 0), 0) / conProb.length) : 0
  const ids = visibles.map((f) => f.id_empresa)
  const todasMarcadas = ids.length > 0 && ids.every((id) => sel.marcadas.has(id))

  function exportar() {
    const lista = sel.n ? visibles.filter((f) => sel.marcadas.has(f.id_empresa)) : visibles
    descargarCSV('empresas', lista.map((f) => ({
      Empresa: f.nombre, Sector: f.sector ?? '', Tipo: tipoClienteInfo(f.tipo_cliente).texto, Responsable: nombreCompleto(f.responsable),
      Telefono: f.telefono ?? '', Correo: f.correo ?? '', Ciudad: f.ciudad ?? '', 'Oportunidades abiertas': f.abiertas,
      'Valor en curso': f.valor, 'Probabilidad media': f.probabilidad ?? '', Animales: f.animal.length,
      'Ultima interaccion': f.ultima ? `${formatDia(f.ultima.fecha)} ${f.ultima.texto}` : '',
    })))
  }

  async function eliminar(f: Fila) {
    const ok = await confirmar({
      titulo: `¿Eliminar ${f.nombre}?`,
      texto: `Se borrarán también sus ${f.animal.length} animales. Sus oportunidades se conservan sin empresa.`,
      boton: 'Eliminar', peligro: true,
    })
    if (!ok) return
    const { error: err } = await createClient().from('empresa').delete().eq('id_empresa', f.id_empresa)
    if (err) return aviso(errorLegible(err), 'error')
    aviso('Empresa eliminada')
    recargar()
  }

  return (
    <div className="flex h-full flex-col">
      <Pestanas
        activa={pestana}
        onCambiar={setPestana}
        pestanas={[
          { id: 'todas', texto: 'Todas', contador: cuentas.todas },
          { id: 'nuevo', texto: 'Nuevas', contador: cuentas.nuevo },
          { id: 'habitual', texto: 'Habituales', contador: cuentas.habitual },
          { id: 'convenio', texto: 'Convenio', contador: cuentas.convenio },
        ]}
      />
      <BarraFiltros
        filtros={
          <>
            <FiltroPastilla etiqueta="Ordenar" valor={orden} onChange={setOrden} opciones={ORDEN} />
            <FiltroPastilla etiqueta="Responsable" valor={responsable} onChange={setResponsable}
              opciones={[{ valor: 'todos', texto: 'Todos' }, ...empleados.map((e) => ({ valor: e.id_empleado, texto: nombreCompleto(e) }))]} />
            <FiltroPastilla etiqueta="Sector" valor={sector} onChange={setSector}
              opciones={[{ valor: 'todos', texto: 'Todos' }, ...SECTORES.map((s) => ({ valor: s, texto: s }))]} />
            <FiltroPastilla etiqueta="Actividad" valor={periodo} onChange={setPeriodo} opciones={PERIODOS} />
          </>
        }
        acciones={
          <>
            <button type="button" className="btn-secundario" onClick={exportar}>
              <Icono nombre="exportar" tamano={14} /> Exportar{sel.n ? ` (${sel.n})` : ''}
            </button>
            <button type="button" className="btn-primario" onClick={() => setEditando(null)}>
              <Icono nombre="mas" tamano={14} /> Nueva empresa
            </button>
          </>
        }
      />

      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : (
        <div className="min-h-0 flex-1 overflow-auto border-t border-borde">
          <table className="tabla min-w-[1080px]">
            <thead>
              <tr>
                <th className="w-12 !pl-4 sm:!pl-6"><Casilla marcada={todasMarcadas} parcial={sel.n > 0 && !todasMarcadas} onChange={(v) => sel.todas(ids, v)} etiqueta="Seleccionar todas" /></th>
                <th>Empresa</th>
                <th>Sector y tipo</th>
                <th>Responsable</th>
                <th className="text-right">Abiertas</th>
                <th className="text-right">Valor en curso</th>
                <th>Probabilidad</th>
                <th>Actividad</th>
                <th>Última interacción</th>
                <th className="w-14 text-center">Acción</th>
              </tr>
            </thead>
            {cargando && !datos ? <FilasCargando columnas={10} /> : (
              <tbody>
                {visibles.map((f) => {
                  const tipo = tipoClienteInfo(f.tipo_cliente)
                  return (
                    <tr key={f.id_empresa} data-seleccionada={sel.marcadas.has(f.id_empresa)} className="cursor-pointer" onClick={() => router.push(`/empresas/${f.id_empresa}`)}>
                      <td className="!pl-4 sm:!pl-6"><Casilla marcada={sel.marcadas.has(f.id_empresa)} onChange={() => sel.alternar(f.id_empresa)} /></td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar nombre={f.nombre} foto={f.logo} cuadrado />
                          <span className="font-medium text-texto">{f.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          {f.sector && <Etiqueta tono={tonoDeTexto(f.sector)}>{f.sector}</Etiqueta>}
                          <Etiqueta tono={tipo.tono}>{tipo.texto}</Etiqueta>
                        </div>
                      </td>
                      <td>
                        {f.responsable ? (
                          <div className="flex items-center gap-2">
                            <Avatar nombre={nombreCompleto(f.responsable)} foto={f.responsable.foto} />
                            <span className="text-texto" title={nombreCompleto(f.responsable)}>{f.responsable.nombre}</span>
                          </div>
                        ) : <span className="text-texto-3">Sin asignar</span>}
                      </td>
                      <td className="text-right tabular-nums">{f.abiertas}</td>
                      <td className="text-right tabular-nums"><span className="text-texto-3">€</span> {formatEUR(f.valor).replace('€', '').trim()}</td>
                      <td>{f.probabilidad != null ? <BarraProbabilidad valor={f.probabilidad} /> : <span className="text-texto-3">—</span>}</td>
                      <td><MiniBarras valores={f.tendencia} titulo="Actividad de las últimas 10 semanas" /></td>
                      <td>
                        {f.ultima ? (
                          <span className="flex items-center gap-1.5 text-texto">
                            <Icono nombre="calendario" tamano={14} className="text-texto-3" />
                            {formatDia(f.ultima.fecha)}
                            <span className="mx-1 h-3.5 w-px bg-borde" />
                            <span className="text-texto-2">{f.ultima.texto}</span>
                          </span>
                        ) : <span className="text-texto-3">—</span>}
                      </td>
                      <td className="text-center">
                        <Menu opciones={[
                          { texto: 'Ver ficha', icono: 'ojo', href: `/empresas/${f.id_empresa}` },
                          { texto: 'Nueva oportunidad', icono: 'mas', onClick: () => setNuevaOportunidad(f.id_empresa) },
                          { texto: 'Editar', icono: 'lapiz', onClick: () => setEditando(f) },
                          { texto: 'Eliminar', icono: 'papelera', onClick: () => eliminar(f), peligro: true, oculto: !esAdmin },
                        ]} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            )}
          </table>
          {!cargando && visibles.length === 0 && (
            <Vacio icono="empresa" titulo={filas.length ? 'Ninguna empresa con estos filtros' : 'Todavía no hay empresas'} texto={filas.length ? 'Prueba a cambiar los filtros.' : 'Crea la primera con el botón "Nueva empresa".'} />
          )}
        </div>
      )}

      <PieTabla items={[
        { valor: visibles.length, etiqueta: visibles.length === 1 ? 'empresa en vista' : 'empresas en vista' },
        { valor: formatEUR(totalValor), etiqueta: 'en curso' },
        { valor: `${probMedia}%`, etiqueta: 'probabilidad media' },
        ...(sel.n ? [{ valor: sel.n, etiqueta: sel.n === 1 ? 'seleccionada' : 'seleccionadas' }] : []),
      ]} />

      <FormEmpresa abierto={editando !== undefined} empresa={editando} onCerrar={() => setEditando(undefined)} onGuardada={() => recargar()} />
      <FormOportunidad
        abierto={!!nuevaOportunidad}
        onCerrar={() => setNuevaOportunidad(null)}
        inicial={nuevaOportunidad ? { id_empresa_fk: nuevaOportunidad } : undefined}
        onGuardada={(id) => router.push(`/oportunidades/${id}`)}
      />
    </div>
  )
}
