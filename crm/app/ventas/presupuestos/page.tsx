'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { nombreCliente } from '@/lib/crm-utils'
import { codigoVenta, coincideVenta, deComercial, ESTADOS_VENTA_ABIERTOS, filaCSVVenta, opcionesComercial, SELECT_VENTA } from '@/lib/ventas-utils'
import { descargarPdfConAviso } from '@/lib/ventas-pdf'
import { descargarCSV, diasHasta, errorLegible, formatDia, formatEUR, normalizar } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Venta } from '@/types'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import BuscadorPastilla from '@/components/ui/BuscadorPastilla'
import Etiqueta from '@/components/ui/Etiqueta'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import PieTabla from '@/components/ui/PieTabla'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FilasCargando } from '@/components/ui/Cargando'
import { CeldaVenta, Comercial, EstadoVentaEtiquetas } from '@/components/ventas/CeldasVenta'
import FormVenta from '@/components/ventas/FormVenta'

const esAbierto = (v: Venta) => ESTADOS_VENTA_ABIERTOS.includes(v.estado)

export default function PresupuestosPage() {
  const router = useRouter()
  const { empleado, esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const { empleados } = useCatalogos()
  const [pestana, setPestana] = useState('abiertos')
  const [orden, setOrden] = useState('reciente')
  const [comercial, setComercial] = useState('todos')
  const [periodo, setPeriodo] = useState('todo')
  const [texto, setTexto] = useState('')
  const [creando, setCreando] = useState(false)

  // Los pedidos confirmados tienen su propia pantalla
  const { datos, cargando, error, recargar } = useConsulta(async (sb) =>
    sinError(await sb.from('venta').select(SELECT_VENTA).neq('estado', 'pedido').order('fecha_creacion', { ascending: false })) as Venta[],
  )
  const todos = useMemo(() => datos ?? [], [datos])

  const filtrados = useMemo(() => {
    const q = normalizar(texto)
    return todos.filter((v) =>
      deComercial(v, comercial, empleado?.id_empleado) &&
      (periodo === 'todo' || -diasHasta(v.fecha) <= Number(periodo)) &&
      coincideVenta(v, q),
    )
  }, [todos, comercial, periodo, texto, empleado])

  const visibles = useMemo(() => {
    const r = filtrados.filter((v) => pestana === 'todos' || (pestana === 'abiertos' ? esAbierto(v) : v.estado === pestana))
    const cmp: Record<string, (a: Venta, b: Venta) => number> = {
      reciente: (a, b) => b.fecha.localeCompare(a.fecha) || b.numero - a.numero,
      total: (a, b) => b.total - a.total,
      validez: (a, b) => a.fecha_validez.localeCompare(b.fecha_validez),
    }
    return [...r].sort(cmp[orden])
  }, [filtrados, pestana, orden])

  const abiertos = todos.filter(esAbierto)
  useTituloPagina({
    titulo: 'Presupuestos',
    insignia: <Etiqueta punto>{abiertos.length} abiertos · {formatEUR(abiertos.reduce((s, v) => s + Number(v.total), 0))}</Etiqueta>,
  }, [todos])

  async function eliminar(v: Venta) {
    const codigo = codigoVenta(v.numero)
    const ok = await confirmar({
      titulo: `¿Eliminar el presupuesto ${codigo} de ${nombreCliente(v)}?`,
      texto: 'Se borrarán también sus líneas. Esta acción no se puede deshacer.',
      boton: 'Eliminar presupuesto',
      peligro: true,
    })
    if (!ok) return
    const { error: err } = await createClient().from('venta').delete().eq('id_venta', v.id_venta)
    if (err) return aviso(errorLegible(err), 'error')
    aviso(`Presupuesto ${codigo} eliminado`)
    recargar()
  }

  const descargar = (v: Venta) => descargarPdfConAviso(v, aviso)

  const totalVista = visibles.reduce((s, v) => s + Number(v.total), 0)

  return (
    <div className="flex h-full flex-col">
      <Pestanas activa={pestana} onCambiar={setPestana} pestanas={[
        { id: 'abiertos', texto: 'Abiertos', contador: filtrados.filter(esAbierto).length },
        { id: 'presupuesto', texto: 'Presupuesto', contador: filtrados.filter((v) => v.estado === 'presupuesto').length },
        { id: 'enviado', texto: 'Enviado', contador: filtrados.filter((v) => v.estado === 'enviado').length },
        { id: 'cancelado', texto: 'Cancelados', contador: filtrados.filter((v) => v.estado === 'cancelado').length },
        { id: 'todos', texto: 'Todos', contador: filtrados.length },
      ]} />
      <BarraFiltros
        filtros={
          <>
            <FiltroPastilla etiqueta="Ordenar" valor={orden} onChange={setOrden} opciones={[
              { valor: 'reciente', texto: 'Más recientes' }, { valor: 'total', texto: 'Total mayor' }, { valor: 'validez', texto: 'Validez más próxima' },
            ]} />
            <FiltroPastilla etiqueta="Comercial" valor={comercial} onChange={setComercial} opciones={opcionesComercial(empleados, empleado?.id_empleado)} />
            <FiltroPastilla etiqueta="Fecha" valor={periodo} onChange={setPeriodo} opciones={[
              { valor: 'todo', texto: 'Siempre' }, { valor: '7', texto: '7 días' }, { valor: '30', texto: '30 días' }, { valor: '90', texto: '90 días' },
            ]} />
            <BuscadorPastilla valor={texto} onChange={setTexto} ayuda="Número, cliente, animal…" />
          </>
        }
        acciones={
          <>
            <button type="button" className="btn-secundario" onClick={() => descargarCSV('presupuestos', visibles.map(filaCSVVenta))}><Icono nombre="exportar" tamano={14} /> Exportar</button>
            <button type="button" className="btn-primario" onClick={() => setCreando(true)}><Icono nombre="mas" tamano={14} /> Crear presupuesto</button>
          </>
        }
      />

      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : (
        <div className="@container min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-t border-borde">
          <table className="tabla">
            <caption className="sr-only">Presupuestos</caption>
            <thead>
              <tr>
                <th scope="col" className="w-full !pl-4 sm:!pl-6 @min-[1000px]:w-auto">Presupuesto</th>
                <th scope="col">Estado</th>
                <th scope="col" className="hidden @min-[1000px]:table-cell">Animal</th>
                <th scope="col" className="hidden @min-[860px]:table-cell">Comercial</th>
                <th scope="col" className="hidden @min-[640px]:table-cell">Fecha</th>
                <th scope="col" className="hidden @min-[740px]:table-cell">Validez</th>
                <th scope="col" className="text-right">Total</th>
                <th scope="col" className="w-14 text-center">Acción</th>
              </tr>
            </thead>
            {cargando && !datos ? <FilasCargando columnas={8} /> : (
              <tbody>
                {visibles.map((v) => (
                  <tr key={v.id_venta} className="cursor-pointer" onClick={() => router.push(`/ventas/presupuestos/${v.id_venta}`)}>
                    <CeldaVenta v={v} />
                    <td><EstadoVentaEtiquetas v={v} /></td>
                    <td className="hidden text-texto-2 @min-[1000px]:table-cell">{v.animal ? v.animal.nombre : '—'}</td>
                    <td className="hidden @min-[860px]:table-cell"><Comercial v={v} /></td>
                    <td className="hidden tabular-nums @min-[640px]:table-cell">{formatDia(v.fecha)}</td>
                    <td className="hidden tabular-nums @min-[740px]:table-cell">{formatDia(v.fecha_validez)}</td>
                    <td className="text-right whitespace-nowrap tabular-nums">{formatEUR(v.total, 2)}</td>
                    <td className="text-center">
                      <Menu opciones={[
                        { texto: 'Abrir', icono: 'ojo', href: `/ventas/presupuestos/${v.id_venta}` },
                        { texto: 'Descargar PDF', icono: 'descargar', onClick: () => descargar(v) },
                        { texto: 'Eliminar', icono: 'papelera', onClick: () => eliminar(v), peligro: true, oculto: !esAdmin || !['presupuesto', 'cancelado'].includes(v.estado) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!cargando && visibles.length === 0 && (todos.length === 0
            ? <Vacio icono="venta" titulo="Aún no hay presupuestos" texto="Se crean desde una oportunidad o con el botón Crear presupuesto."><button type="button" className="btn-secundario" onClick={() => setCreando(true)}><Icono nombre="mas" tamano={14} /> Crear presupuesto</button></Vacio>
            : <Vacio icono="venta" titulo="No hay presupuestos aquí" texto="Quita los filtros para verlos todos."><button type="button" className="btn-secundario" onClick={() => { setPestana('todos'); setComercial('todos'); setPeriodo('todo'); setTexto('') }}>Quitar filtros</button></Vacio>)}
        </div>
      )}

      <PieTabla items={[
        { valor: visibles.length, etiqueta: visibles.length === 1 ? 'presupuesto en vista' : 'presupuestos en vista' },
        { valor: formatEUR(totalVista, 2), etiqueta: 'total' },
        { valor: formatEUR(visibles.length ? totalVista / visibles.length : 0, 2), etiqueta: 'importe medio' },
      ]} />

      <FormVenta abierto={creando} onCerrar={() => setCreando(false)} onGuardada={(id) => router.push(`/ventas/presupuestos/${id}`)} />
    </div>
  )
}
