'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcularLinea, codigoVenta, esVentaEditable, formatCantidad, precioConIva, TIPOS_IVA, totalesVenta } from '@/lib/ventas-utils'
import { cn, errorLegible, formatEUR } from '@/lib/utils'
import { useAviso } from '@/hooks/useAviso'
import { useCatalogos } from '@/hooks/useCatalogos'
import type { LineaVenta, Venta } from '@/types'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import Campo from '@/components/ui/Campo'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'

type CampoLinea = 'descripcion' | 'cantidad' | 'precio_unitario' | 'descuento' | 'iva'

// En los campos se escribe con coma decimal y sin punto de miles: "12,5"
const aTexto = (n: number, decimales?: number) => (decimales === undefined ? String(Number(n)) : Number(n).toFixed(decimales)).replace('.', ',')
const leerNumero = (t: string) => {
  const s = t.trim().replace(',', '.')
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN
}

const VALIDAR: Record<Exclude<CampoLinea, 'iva'>, (v: string | number) => string | null> = {
  descripcion: (v) => !String(v) ? 'Escribe qué se vende en esta línea.' : String(v).length > 300 ? 'Acórtala: como mucho 300 caracteres.' : null,
  cantidad: (v) => Number.isNaN(v) || Number(v) <= 0 ? 'Escribe una cantidad mayor que 0, por ejemplo 1 o 2,5.' : null,
  precio_unitario: (v) => Number.isNaN(v) || Number(v) < 0 ? 'Escribe el precio sin IVA, de 0 en adelante, por ejemplo 45,50.' : null,
  descuento: (v) => Number.isNaN(v) || Number(v) > 100 ? 'Escribe un descuento entre 0 y 100.' : null,
}

// La tabla pasa a filas apiladas en anchuras estrechas: descripción arriba y las cifras debajo
// Con table-fixed las anchuras de la cabecera mandan: las cifras se leen enteras y la descripción ocupa el resto
const CELDA = 'h-auto border-b-0 p-0 @min-[768px]:table-cell @min-[768px]:h-14 @min-[768px]:border-b @min-[768px]:px-2 @min-[768px]:py-2'
/** Nombre de la columna encima del valor cuando las cabeceras no se ven */
const ETIQUETA_ESTRECHA = 'mb-2 block text-[12px] text-texto-3 @min-[768px]:sr-only'

/** Campo de texto de una celda: se guarda al salir de él o con Enter, solo si cambia; Escape lo deja como estaba */
function CeldaEditable({ id, corto, de, valor, numerico, decimales, validar, onGuardar }: {
  id: string
  /** "Cantidad" (se ve en pantallas estrechas) */
  corto: string
  /** "de Esterilización" (solo para el lector de pantalla) */
  de: string
  valor: string | number
  numerico?: boolean
  decimales?: number
  validar: (v: string | number) => string | null
  onGuardar: (v: string | number) => void
}) {
  const formatear = (v: string | number) => (numerico ? aTexto(Number(v), decimales) : String(v))
  const [previo, setPrevio] = useState(valor)
  const [texto, setTexto] = useState(() => formatear(valor))
  const [error, setError] = useState<string | null>(null)
  // Si el valor cambia desde fuera (al guardar o recargar), se enseña el nuevo
  if (valor !== previo) {
    setPrevio(valor)
    setTexto(formatear(valor))
    setError(null)
  }

  function confirmar() {
    const v = numerico ? leerNumero(texto) : texto.trim()
    const e = validar(v)
    setError(e)
    if (e) return
    if (v === valor || (numerico && v === Number(valor))) return setTexto(formatear(valor))
    onGuardar(v)
  }

  return (
    <>
      <label htmlFor={id} className={ETIQUETA_ESTRECHA}>{corto}<span className="sr-only"> {de}</span></label>
      <input
        id={id}
        type="text"
        inputMode={numerico ? 'decimal' : undefined}
        autoComplete="off"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); confirmar() }
          else if (e.key === 'Escape') { setTexto(formatear(valor)); setError(null) }
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn('input px-2', numerico && 'text-right tabular-nums')}
      />
      {error && (
        <span id={`${id}-error`} role="alert" className="mt-2 flex items-start whitespace-normal gap-2 text-[12.5px] text-rose-700 dark:text-rose-400">
          <Icono nombre="alerta" tamano={14} className="mt-px shrink-0" /> {error}
        </span>
      )}
    </>
  )
}

/** Valor de solo lectura con el nombre de la columna encima en pantallas estrechas */
function Valor({ corto, children }: { corto: string; children: ReactNode }) {
  return <><span className="block text-[12px] text-texto-3 @min-[768px]:hidden">{corto}</span>{children}</>
}

/**
 * Líneas de una venta con sus totales. Mientras es un presupuesto (o enviado) cada celda se edita
 * en la propia tabla y se añaden líneas del catálogo o de texto libre; después es de solo lectura.
 * Los importes de la venta los calcula la base de datos: "onCambio" recarga la venta tras cada cambio.
 */
export default function LineasVenta({ venta, lineas: lineasBD, onCambio }: {
  venta: Venta
  /** Ordenadas por "orden" */
  lineas: LineaVenta[]
  onCambio: () => void
}) {
  const { aviso } = useAviso()
  const { servicios } = useCatalogos()
  const editable = esVentaEditable(venta.estado)
  const codigo = codigoVenta(venta.numero)

  // Copia local para ver el cambio al momento (se sustituye por lo de la base de datos al recargar)
  const [previas, setPrevias] = useState(lineasBD)
  const [lineas, setLineas] = useState(lineasBD)
  if (lineasBD !== previas) {
    setPrevias(lineasBD)
    setLineas(lineasBD)
  }

  const [vueltaSelector, setVueltaSelector] = useState(0)
  const foco = useRef<string | null>(null)
  useEffect(() => {
    if (!foco.current) return
    const el = document.getElementById(foco.current)
    if (el) { el.focus(); foco.current = null }
  }, [lineas])

  const opciones = useMemo(() => servicios.map((s) => ({ id: s.id_servicio, texto: s.nombre, detalle: `${formatEUR(precioConIva(s), 2)} con IVA` })), [servicios])

  // Mientras hay un cambio sin recargar, los totales se calculan aquí; si no, mandan los de la base de datos
  const calculado = totalesVenta(lineas)
  const sincronizado = lineas === lineasBD
  const base = sincronizado ? venta.base_imponible : calculado.base
  const iva = sincronizado ? venta.importe_iva : calculado.iva
  const total = sincronizado ? venta.total : calculado.total

  async function guardar(l: LineaVenta, campo: CampoLinea, valor: string | number) {
    const anterior = l[campo]
    const cambiada = { ...l, [campo]: valor }
    setLineas((ls) => ls.map((x) => (x.id_linea_venta === l.id_linea_venta ? { ...cambiada, subtotal: calcularLinea(cambiada).subtotal } : x)))
    const { error } = await createClient().from('linea_venta').update({ [campo]: valor }).eq('id_linea_venta', l.id_linea_venta)
    if (error) {
      setLineas((ls) => ls.map((x) => (x.id_linea_venta === l.id_linea_venta ? { ...x, [campo]: anterior, subtotal: l.subtotal } : x)))
      return aviso(errorLegible(error), 'error')
    }
    onCambio()
  }

  async function insertar(fila: Omit<LineaVenta, 'id_linea_venta' | 'subtotal' | 'servicio'> & { id_linea_venta?: string }) {
    const { data, error } = await createClient().from('linea_venta').insert(fila).select('id_linea_venta').single()
    if (error) { aviso(errorLegible(error), 'error'); return null }
    onCambio()
    return (data as { id_linea_venta: string }).id_linea_venta
  }

  const siguienteOrden = () => Math.max(0, ...lineas.map((l) => l.orden)) + 1

  async function anadirServicio(idServicio: string) {
    const s = servicios.find((x) => x.id_servicio === idServicio)
    if (!s) return
    setVueltaSelector((n) => n + 1)
    const nueva = await insertar({
      id_venta_fk: venta.id_venta, id_servicio_fk: s.id_servicio, descripcion: s.nombre,
      cantidad: 1, precio_unitario: s.precio_base, descuento: 0, iva: s.iva, orden: siguienteOrden(),
    })
    if (nueva) foco.current = `${nueva}-cantidad`
  }

  async function anadirLibre(texto: string) {
    setVueltaSelector((n) => n + 1)
    const nueva = await insertar({
      id_venta_fk: venta.id_venta, id_servicio_fk: null, descripcion: texto.slice(0, 300) || 'Línea libre',
      cantidad: 1, precio_unitario: 0, descuento: 0, iva: 21, orden: siguienteOrden(),
    })
    // Sin texto se va a la descripción para escribirla; con texto, al precio (empieza en 0)
    if (nueva) foco.current = `${nueva}-${texto ? 'precio_unitario' : 'descripcion'}`
  }

  async function quitar(l: LineaVenta) {
    setLineas((ls) => ls.filter((x) => x.id_linea_venta !== l.id_linea_venta))
    const { error } = await createClient().from('linea_venta').delete().eq('id_linea_venta', l.id_linea_venta)
    if (error) {
      setLineas(lineasBD)
      return aviso(errorLegible(error), 'error')
    }
    const { id_linea_venta, id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva: tipo, orden } = l
    aviso(`Línea «${descripcion}» quitada`, 'exito', {
      deshacer: async () => {
        if (await insertar({ id_linea_venta, id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva: tipo, orden })) {
          aviso(`Línea «${descripcion}» recuperada`, 'info')
        }
      },
    })
    onCambio()
  }

  return (
    <div className="@container">
      {lineas.length > 0 ? (
        <table role="table" className="tabla block @min-[768px]:table @min-[768px]:table-fixed">
          <caption className="sr-only">Líneas de {codigo}</caption>
          <thead role="rowgroup" className="hidden @min-[768px]:table-header-group">
            <tr role="row">
              <th role="columnheader" scope="col" className="!pl-6">Descripción</th>
              <th role="columnheader" scope="col" className="w-24 text-right">Cantidad</th>
              <th role="columnheader" scope="col" className="w-32 text-right">Precio</th>
              <th role="columnheader" scope="col" className="w-20 text-right">Dto. %</th>
              <th role="columnheader" scope="col" className="w-28">IVA</th>
              <th role="columnheader" scope="col" className="w-32 text-right">Subtotal</th>
              {editable && <th role="columnheader" scope="col" className="w-20"><span className="sr-only">Quitar</span></th>}
            </tr>
          </thead>
          <tbody role="rowgroup" className="block @min-[768px]:table-row-group">
            {lineas.map((l, i) => {
              const de = `de ${l.descripcion}`
              const id = (campo: CampoLinea) => `${l.id_linea_venta}-${campo}`
              return (
                <tr key={l.id_linea_venta} role="row" className="grid grid-cols-2 gap-2 border-b border-borde-suave px-4 py-4 sm:px-6 @min-[400px]:grid-cols-4 @min-[768px]:table-row @min-[768px]:border-b-0 @min-[768px]:p-0">
                  <td role="cell" className={cn('block', CELDA, 'col-span-full whitespace-normal @min-[768px]:pl-6', !editable && 'font-medium text-texto')}>
                    {editable
                      ? <CeldaEditable id={id('descripcion')} corto="Descripción" de={`de la línea ${i + 1}`} valor={l.descripcion} validar={VALIDAR.descripcion} onGuardar={(v) => guardar(l, 'descripcion', v)} />
                      : <span className="break-words">{l.descripcion}</span>}
                  </td>
                  <td role="cell" className={cn('block', CELDA, 'tabular-nums @min-[768px]:text-right')}>
                    {editable
                      ? <CeldaEditable id={id('cantidad')} corto="Cantidad" de={de} valor={l.cantidad} numerico validar={VALIDAR.cantidad} onGuardar={(v) => guardar(l, 'cantidad', v)} />
                      : <Valor corto="Cantidad">{formatCantidad(l.cantidad)}</Valor>}
                  </td>
                  <td role="cell" className={cn('block', CELDA, 'tabular-nums @min-[768px]:text-right')}>
                    {editable
                      ? <CeldaEditable id={id('precio_unitario')} corto="Precio" de={`sin IVA ${de}`} valor={l.precio_unitario} numerico decimales={2} validar={VALIDAR.precio_unitario} onGuardar={(v) => guardar(l, 'precio_unitario', v)} />
                      : <Valor corto="Precio">{formatEUR(l.precio_unitario, 2)}</Valor>}
                  </td>
                  <td role="cell" className={cn('block', CELDA, 'tabular-nums @min-[768px]:text-right')}>
                    {editable
                      ? <CeldaEditable id={id('descuento')} corto="Dto. %" de={`(descuento en %) ${de}`} valor={l.descuento} numerico validar={VALIDAR.descuento} onGuardar={(v) => guardar(l, 'descuento', v)} />
                      : <Valor corto="Dto. %">{Number(l.descuento) ? `${formatCantidad(l.descuento)} %` : <span className="text-texto-3">—</span>}</Valor>}
                  </td>
                  <td role="cell" className={cn('block', CELDA)}>
                    {editable ? (
                      <>
                        <label htmlFor={id('iva')} className={ETIQUETA_ESTRECHA}>IVA<span className="sr-only"> {de}</span></label>
                        <select id={id('iva')} className="input pr-8 pl-2" value={Number(l.iva)}
                          onChange={(e) => { const v = Number(e.target.value); if (TIPOS_IVA.includes(v)) guardar(l, 'iva', v) }}>
                          {TIPOS_IVA.map((t) => <option key={t} value={t}>{t} %</option>)}
                        </select>
                      </>
                    ) : <Valor corto="IVA">{l.iva} %</Valor>}
                  </td>
                  <td role="cell" className={cn('block', CELDA, 'font-medium whitespace-nowrap tabular-nums @min-[768px]:text-right', editable ? '@min-[400px]:col-span-3' : 'col-span-full @min-[768px]:pr-6')}>
                    <Valor corto="Subtotal">{formatEUR(l.subtotal, 2)}</Valor>
                  </td>
                  {editable && (
                    <td role="cell" className={cn('flex', CELDA, 'items-end justify-end @min-[768px]:pr-6')}>
                      <button type="button" className="btn-fantasma w-11 px-0" aria-label={`Quitar la línea ${l.descripcion}`} title="Quitar la línea" onClick={() => quitar(l)}>
                        <Icono nombre="papelera" tamano={15} />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <Vacio icono="producto" titulo="Aún no tiene líneas" texto={editable ? 'Busca abajo un producto o servicio del catálogo para añadir la primera.' : 'Se quedó sin líneas antes de cerrarse.'} />
      )}

      {editable && (
        <div className="border-b border-borde-suave px-4 py-4 sm:px-6">
          <Campo etiqueta="Añadir línea" ayuda="Busca un producto o servicio del catálogo, o escribe el texto de una línea libre." className="max-w-xl">
            <SelectorBuscable
              key={vueltaSelector}
              valor=""
              opciones={opciones}
              onChange={(idServicio) => idServicio && anadirServicio(idServicio)}
              ayuda="Producto o servicio…"
              textoCrear="Añadir línea libre"
              onCrear={anadirLibre}
            />
          </Campo>
        </div>
      )}

      {lineas.length > 0 && (
        <div className="flex justify-end px-4 py-4 sm:px-6">
          <dl className="w-full max-w-xs space-y-2 text-[13.5px] tabular-nums">
            <div className="flex justify-between gap-4"><dt className="text-texto-3">Base imponible</dt><dd>{formatEUR(base, 2)}</dd></div>
            {calculado.desglose.map((d) => (
              <div key={d.tipo} className="flex justify-between gap-4"><dt className="text-texto-3">IVA {d.tipo} %</dt><dd>{formatEUR(d.iva, 2)}</dd></div>
            ))}
            {calculado.desglose.length > 1 && (
              <div className="flex justify-between gap-4"><dt className="text-texto-3">Total IVA</dt><dd>{formatEUR(iva, 2)}</dd></div>
            )}
            <div className="flex justify-between gap-4 border-t border-borde pt-2 text-[15px] font-semibold text-texto"><dt>Total</dt><dd>{formatEUR(total, 2)}</dd></div>
          </dl>
        </div>
      )}
    </div>
  )
}
