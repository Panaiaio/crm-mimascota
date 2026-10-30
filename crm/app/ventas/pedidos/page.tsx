'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { coincideVenta, condicionPagoTexto, deComercial, enMes, filaCSVVenta, opcionesComercial, SELECT_VENTA } from '@/lib/ventas-utils'
import { descargarPdfConAviso } from '@/lib/ventas-pdf'
import { revisarFacturas, textoResultado } from '@/lib/agente'
import { descargarCSV, errorLegible, formatDia, formatEUR, normalizar } from '@/lib/utils'
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
import { CeldaVenta, Comercial } from '@/components/ventas/CeldasVenta'

// Pestañas por la fecha en que se confirmó el pedido
const PESTANAS = [
  { id: 'este', texto: 'Este mes', vacio: 'No hay pedidos este mes', filtro: (v: Venta) => enMes(v.fecha_confirmacion, 0) },
  { id: 'pasado', texto: 'Mes pasado', vacio: 'No hay pedidos el mes pasado', filtro: (v: Venta) => enMes(v.fecha_confirmacion, -1) },
  { id: 'todos', texto: 'Todos', vacio: 'Aún no hay pedidos', filtro: () => true },
]

export default function PedidosPage() {
  const router = useRouter()
  const { empleado } = useSesion()
  const { aviso } = useAviso()
  const { empleados } = useCatalogos()
  const [pestana, setPestana] = useState('este')
  const [orden, setOrden] = useState('reciente')
  const [comercial, setComercial] = useState('todos')
  const [texto, setTexto] = useState('')
  // Paso en curso del botón «Revisar facturas» (null = no se está revisando)
  const [revisando, setRevisando] = useState<string | null>(null)

  const { datos, cargando, error, recargar } = useConsulta(async (sb) =>
    sinError(await sb.from('venta').select(SELECT_VENTA).eq('estado', 'pedido').order('fecha_confirmacion', { ascending: false })) as Venta[],
  )
  const todos = useMemo(() => datos ?? [], [datos])

  const filtrados = useMemo(() => {
    const q = normalizar(texto)
    return todos.filter((v) => deComercial(v, comercial, empleado?.id_empleado) && coincideVenta(v, q))
  }, [todos, comercial, texto, empleado])

  const actual = PESTANAS.find((p) => p.id === pestana) ?? PESTANAS[0]
  const visibles = useMemo(() => {
    const r = filtrados.filter(actual.filtro)
    const cmp: Record<string, (a: Venta, b: Venta) => number> = {
      reciente: (a, b) => (b.fecha_confirmacion ?? '').localeCompare(a.fecha_confirmacion ?? ''),
      total: (a, b) => b.total - a.total,
    }
    return [...r].sort(cmp[orden])
  }, [filtrados, actual, orden])

  const delMes = todos.filter(PESTANAS[0].filtro)
  useTituloPagina({
    titulo: 'Pedidos',
    insignia: <Etiqueta punto>{delMes.length} este mes · {formatEUR(delMes.reduce((s, v) => s + Number(v.total), 0))}</Etiqueta>,
  }, [todos])

  const descargar = (v: Venta) => descargarPdfConAviso(v, aviso)

  // El agente lector de facturas guarda en la base de datos las facturas de los pedidos que falten
  async function revisar() {
    if (revisando) return
    setRevisando('Comprobando los PDF…')
    try {
      const r = await revisarFacturas(todos.map((v) => v.id_venta), setRevisando)
      if (r.estado === 'sin_agente') {
        aviso('El agente de facturas no está encendido. Arráncalo (python agente.py) y hará la revisión al momento.', 'info')
      } else if (r.estado === 'error') {
        aviso(r.mensaje ?? 'El agente no ha podido revisar las facturas. Mira su ventana para ver el motivo.', 'error')
      } else {
        aviso(textoResultado(r), r.errores ? 'info' : 'exito')
        if (r.errores) aviso(`${r.errores} con error: ${r.mensaje ?? 'mira la ventana del agente.'}`, 'error')
      }
    } catch (e) {
      aviso(errorLegible(e), 'error')
    } finally {
      setRevisando(null)
    }
  }

  const totalVista = visibles.reduce((s, v) => s + Number(v.total), 0)
  const hayFiltros = comercial !== 'todos' || !!texto

  return (
    <div className="flex h-full flex-col">
      <Pestanas activa={pestana} onCambiar={setPestana} pestanas={PESTANAS.map((p) => ({ id: p.id, texto: p.texto, contador: filtrados.filter(p.filtro).length }))} />
      <BarraFiltros
        filtros={
          <>
            <FiltroPastilla etiqueta="Ordenar" valor={orden} onChange={setOrden} opciones={[
              { valor: 'reciente', texto: 'Más recientes' }, { valor: 'total', texto: 'Total mayor' },
            ]} />
            <FiltroPastilla etiqueta="Comercial" valor={comercial} onChange={setComercial} opciones={opcionesComercial(empleados, empleado?.id_empleado)} />
            <BuscadorPastilla valor={texto} onChange={setTexto} ayuda="Número, cliente, animal…" />
          </>
        }
        acciones={
          <>
            <button type="button" className="btn-secundario" onClick={revisar} aria-busy={!!revisando} aria-live="polite">
              <Icono nombre="archivo" tamano={14} /> {revisando ?? 'Revisar facturas'}
            </button>
            <button type="button" className="btn-secundario" onClick={() => descargarCSV('pedidos', visibles.map((v) => ({
              ...filaCSVVenta(v), 'Confirmado el': formatDia(v.fecha_confirmacion), 'Condiciones de pago': condicionPagoTexto(v.condiciones_pago),
            })))}><Icono nombre="exportar" tamano={14} /> Exportar</button>
          </>
        }
      />

      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : (
        <div className="@container min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-t border-borde">
          <table className="tabla">
            <caption className="sr-only">Pedidos de venta</caption>
            <thead>
              <tr>
                <th scope="col" className="w-full !pl-4 sm:!pl-6 @min-[1000px]:w-auto">Pedido</th>
                <th scope="col" className="hidden @min-[1000px]:table-cell">Animal</th>
                <th scope="col" className="hidden @min-[860px]:table-cell">Comercial</th>
                <th scope="col" className="hidden @min-[560px]:table-cell">Confirmado el</th>
                <th scope="col" className="hidden @min-[740px]:table-cell">Condiciones de pago</th>
                <th scope="col" className="text-right">Total</th>
                <th scope="col" className="w-14 text-center">Acción</th>
              </tr>
            </thead>
            {cargando && !datos ? <FilasCargando columnas={7} /> : (
              <tbody>
                {visibles.map((v) => (
                  <tr key={v.id_venta} className="cursor-pointer" onClick={() => router.push(`/ventas/presupuestos/${v.id_venta}`)}>
                    <CeldaVenta v={v} />
                    <td className="hidden text-texto-2 @min-[1000px]:table-cell">{v.animal ? v.animal.nombre : '—'}</td>
                    <td className="hidden @min-[860px]:table-cell"><Comercial v={v} /></td>
                    <td className="hidden tabular-nums @min-[560px]:table-cell">{formatDia(v.fecha_confirmacion)}</td>
                    <td className="hidden text-texto-2 @min-[740px]:table-cell">{condicionPagoTexto(v.condiciones_pago)}</td>
                    <td className="text-right whitespace-nowrap tabular-nums">{formatEUR(v.total, 2)}</td>
                    <td className="text-center">
                      <Menu opciones={[
                        { texto: 'Abrir', icono: 'ojo', href: `/ventas/presupuestos/${v.id_venta}` },
                        { texto: 'Descargar PDF', icono: 'descargar', onClick: () => descargar(v) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!cargando && visibles.length === 0 && (
            <Vacio icono="check" titulo={actual.vacio} texto={hayFiltros ? 'Quita los filtros para verlos todos.' : 'Un presupuesto pasa a pedido cuando el cliente lo acepta y se confirma.'}>
              {hayFiltros && <button type="button" className="btn-secundario" onClick={() => { setComercial('todos'); setTexto('') }}>Quitar filtros</button>}
            </Vacio>
          )}
        </div>
      )}

      <PieTabla items={[
        { valor: visibles.length, etiqueta: visibles.length === 1 ? 'pedido en vista' : 'pedidos en vista' },
        { valor: formatEUR(totalVista, 2), etiqueta: 'total vendido' },
      ]} />
    </div>
  )
}
