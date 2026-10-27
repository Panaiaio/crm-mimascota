'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIAS, TIPOS_SERVICIO, precioConIva } from '@/lib/ventas-utils'
import { descargarCSV, errorLegible, formatEUR, normalizar } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { olvidarCatalogos } from '@/hooks/useCatalogos'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Servicio } from '@/types'
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
import FormProducto from '@/components/ventas/FormProducto'

const ORDEN = [
  { valor: 'nombre', texto: 'Nombre' },
  { valor: 'precio', texto: 'Precio' },
]
const SIN_CATEGORIA = 'sin'
const tipoTexto = (t: Servicio['tipo']) => TIPOS_SERVICIO.find((x) => x.id === t)?.texto ?? t
/** Archivados: activo = false; el resto de pestañas, solo lo activo (todo, servicios o productos) */
const enPestana = (s: Servicio, p: string) => (p === 'archivados' ? !s.activo : s.activo && (p === 'todos' || s.tipo === p))

/** Vacío de cada pestaña cuando no hay filtros puestos */
const VACIOS: Record<string, { titulo: string; texto: string }> = {
  todos: { titulo: 'Todavía no hay nada en el catálogo', texto: 'Aquí aparecerán los servicios y productos que se ponen en los presupuestos.' },
  servicio: { titulo: 'No hay servicios', texto: 'Aquí aparecerán las consultas, vacunas, cirugías y demás servicios de la clínica.' },
  producto: { titulo: 'No hay productos', texto: 'Aquí aparecerán los medicamentos, accesorios y piensos que se venden.' },
  archivados: { titulo: 'No hay nada archivado', texto: 'Lo que se archiva deja de salir en los presupuestos nuevos, pero se conserva en las ventas hechas.' },
}

export default function ProductosPage() {
  const { esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [pestana, setPestana] = useState('todos')
  const [orden, setOrden] = useState('nombre')
  const [categoria, setCategoria] = useState('todas')
  const [texto, setTexto] = useState('')
  const [editando, setEditando] = useState<Servicio | null | undefined>(undefined)

  const { datos, cargando, error, recargar } = useConsulta(async (sb) =>
    sinError(await sb.from('servicio').select('*').order('nombre')) as Servicio[],
  )
  const todos = useMemo(() => datos ?? [], [datos])

  // Categorías de la lista más las que ya tengan los productos guardados
  const categorias = useMemo(
    () => [...new Set([...CATEGORIAS, ...todos.flatMap((s) => (s.categoria ? [s.categoria] : []))])].sort((a, b) => a.localeCompare(b)),
    [todos],
  )

  const filtrados = useMemo(() => {
    const q = normalizar(texto)
    return todos.filter((s) =>
      (categoria === 'todas' || (categoria === SIN_CATEGORIA ? !s.categoria : s.categoria === categoria)) &&
      (!q || normalizar(`${s.nombre} ${s.descripcion ?? ''} ${s.categoria ?? ''}`).includes(q)),
    )
  }, [todos, categoria, texto])

  const visibles = useMemo(() => {
    const r = filtrados.filter((s) => enPestana(s, pestana))
    return orden === 'precio' ? [...r].sort((a, b) => precioConIva(a) - precioConIva(b) || a.nombre.localeCompare(b.nombre)) : r
  }, [filtrados, pestana, orden])

  const activos = todos.filter((s) => s.activo).length
  useTituloPagina({ titulo: 'Productos', insignia: <Etiqueta punto>{activos} en el catálogo</Etiqueta> }, [activos])

  const hayFiltros = categoria !== 'todas' || !!texto
  function quitarFiltros() {
    setCategoria('todas')
    setTexto('')
  }

  function exportar() {
    descargarCSV('productos', visibles.map((s) => ({
      Nombre: s.nombre, Tipo: tipoTexto(s.tipo), Categoria: s.categoria ?? '', 'Precio sin IVA': Number(s.precio_base),
      IVA: s.iva, 'Precio con IVA': precioConIva(s), Descripcion: s.descripcion ?? '', Activo: s.activo ? 'Sí' : 'No',
    })))
  }

  /** Archivar (activo = false) o recuperar, con "Deshacer" */
  async function archivar(s: Servicio, activo: boolean) {
    const sb = createClient()
    const { error: err } = await sb.from('servicio').update({ activo }).eq('id_servicio', s.id_servicio)
    if (err) return aviso(errorLegible(err), 'error')
    olvidarCatalogos()
    aviso(activo ? `«${s.nombre}» vuelve al catálogo` : `«${s.nombre}» archivado: ya no sale en los presupuestos nuevos`, 'exito', {
      deshacer: async () => {
        const { error: e2 } = await createClient().from('servicio').update({ activo: !activo }).eq('id_servicio', s.id_servicio)
        if (e2) return aviso(errorLegible(e2), 'error')
        olvidarCatalogos()
        aviso(`«${s.nombre}» ${activo ? 'vuelve a Archivados' : 'vuelve al catálogo'}`, 'info')
        recargar()
      },
    })
    recargar()
  }

  async function eliminar(s: Servicio) {
    const ok = await confirmar({ titulo: `¿Eliminar «${s.nombre}» del catálogo?`, texto: 'Dejará de salir en la lista de productos.', boton: 'Eliminar producto', peligro: true })
    if (!ok) return
    const { error: err } = await createClient().from('servicio').delete().eq('id_servicio', s.id_servicio)
    if (err) {
      // Lo usa alguna línea de venta (ON DELETE RESTRICT): se ofrece archivarlo
      if (err.code !== '23503') return aviso(errorLegible(err), 'error')
      if (!s.activo) return aviso(`No se puede eliminar «${s.nombre}» porque ya se ha vendido. Ya está archivado y no aparece en los presupuestos nuevos.`, 'error')
      const archivarlo = await confirmar({
        titulo: `No se puede eliminar «${s.nombre}»`,
        texto: 'No se puede eliminar porque ya se ha vendido: archívalo para que no aparezca en los presupuestos nuevos. Las ventas hechas lo conservan.',
        boton: 'Archivar producto',
      })
      if (archivarlo) await archivar(s, false)
      return
    }
    olvidarCatalogos()
    aviso(`«${s.nombre}» eliminado del catálogo`)
    recargar()
  }

  const vacio = hayFiltros
    ? { titulo: 'Nada coincide con estos filtros', texto: 'Quita los filtros o busca con otras palabras.' }
    : VACIOS[pestana]

  return (
    <div className="flex h-full flex-col">
      <Pestanas activa={pestana} onCambiar={setPestana} pestanas={[
        { id: 'todos', texto: 'Todos', contador: filtrados.filter((s) => enPestana(s, 'todos')).length },
        { id: 'servicio', texto: 'Servicios', contador: filtrados.filter((s) => enPestana(s, 'servicio')).length },
        { id: 'producto', texto: 'Productos', contador: filtrados.filter((s) => enPestana(s, 'producto')).length },
        { id: 'archivados', texto: 'Archivados', contador: filtrados.filter((s) => enPestana(s, 'archivados')).length },
      ]} />
      <BarraFiltros
        filtros={
          <>
            <FiltroPastilla etiqueta="Ordenar" valor={orden} onChange={setOrden} opciones={ORDEN} />
            <FiltroPastilla etiqueta="Categoría" valor={categoria} onChange={setCategoria} opciones={[
              { valor: 'todas', texto: 'Todas' }, ...categorias.map((c) => ({ valor: c, texto: c })), { valor: SIN_CATEGORIA, texto: 'Sin categoría' },
            ]} />
            <BuscadorPastilla valor={texto} onChange={setTexto} ayuda="Nombre, categoría…" />
          </>
        }
        acciones={
          <>
            {!esAdmin && <p className="text-[13px] text-texto-3">Solo un administrador puede cambiar el catálogo</p>}
            <button type="button" className="btn-secundario" onClick={exportar}><Icono nombre="exportar" tamano={14} /> Exportar</button>
            {esAdmin && <button type="button" className="btn-primario" onClick={() => setEditando(null)}><Icono nombre="mas" tamano={14} /> Crear producto</button>}
          </>
        }
      />

      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : (
        <div className="@container min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-t border-borde">
          <table className="tabla">
            <caption className="sr-only">Catálogo de productos y servicios</caption>
            <thead>
              <tr>
                <th scope="col" className="w-full !pl-4 sm:!pl-6">Nombre</th>
                <th scope="col" className="hidden @min-[640px]:table-cell">Tipo</th>
                <th scope="col" className="hidden @min-[760px]:table-cell">Categoría</th>
                <th scope="col" className="hidden text-right @min-[520px]:table-cell">Precio sin IVA</th>
                <th scope="col" className="hidden text-right @min-[900px]:table-cell">IVA</th>
                <th scope="col" className="text-right whitespace-nowrap">Precio con IVA</th>
                {esAdmin && <th scope="col" className="w-14 text-center">Acción</th>}
              </tr>
            </thead>
            {cargando && !datos ? <FilasCargando columnas={esAdmin ? 7 : 6} /> : (
              <tbody>
                {visibles.map((s) => (
                  <tr key={s.id_servicio}>
                    <td className="max-w-0 min-w-[160px] !pl-4 sm:!pl-6">
                      <p className="max-w-[420px] truncate font-medium text-texto">{s.nombre}</p>
                      {s.descripcion && <p className="max-w-[420px] truncate text-[12.5px] text-texto-3" title={s.descripcion}>{s.descripcion}</p>}
                    </td>
                    <td className="hidden text-texto-2 @min-[640px]:table-cell">{tipoTexto(s.tipo)}</td>
                    <td className="hidden @min-[760px]:table-cell">{s.categoria ? <span className="text-texto-2">{s.categoria}</span> : <span className="text-texto-3">—</span>}</td>
                    <td className="hidden text-right whitespace-nowrap text-texto-2 tabular-nums @min-[520px]:table-cell">{formatEUR(s.precio_base, 2)}</td>
                    <td className="hidden text-right whitespace-nowrap text-texto-2 tabular-nums @min-[900px]:table-cell">{s.iva} %</td>
                    <td className="text-right font-medium whitespace-nowrap text-texto tabular-nums">{formatEUR(precioConIva(s), 2)}</td>
                    {esAdmin && (
                      <td className="text-center">
                        <Menu opciones={[
                          { texto: 'Editar', icono: 'lapiz', onClick: () => setEditando(s) },
                          s.activo
                            ? { texto: 'Archivar', icono: 'archivo', onClick: () => archivar(s, false) }
                            : { texto: 'Recuperar', icono: 'subir', onClick: () => archivar(s, true) },
                          { texto: 'Eliminar', icono: 'papelera', onClick: () => eliminar(s), peligro: true },
                        ]} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!cargando && visibles.length === 0 && (
            <Vacio icono="producto" titulo={vacio.titulo} texto={vacio.texto}>
              {hayFiltros
                ? <button type="button" className="btn-secundario" onClick={quitarFiltros}>Quitar filtros</button>
                : esAdmin && pestana !== 'archivados'
                  ? <button type="button" className="btn-secundario" onClick={() => setEditando(null)}><Icono nombre="mas" tamano={14} /> Crear producto</button>
                  : pestana !== 'todos' && <button type="button" className="btn-secundario" onClick={() => setPestana('todos')}>Ver todo el catálogo</button>}
            </Vacio>
          )}
        </div>
      )}

      <PieTabla items={[{ valor: visibles.length, etiqueta: visibles.length === 1 ? 'elemento en vista' : 'elementos en vista' }]} />

      <FormProducto abierto={editando !== undefined} producto={editando} onCerrar={() => setEditando(undefined)} onGuardado={() => recargar()} />
    </div>
  )
}
