import type { CondicionPago, EmpleadoBreve, EstadoVenta, LineaVenta, Opcion, Servicio, TipoServicio, Tono, Venta } from '@/types'
import { aFecha, diasHasta, formatDia, formatNumero, nombreCompleto, normalizar } from '@/lib/utils'
import { nombreCliente } from '@/lib/crm-utils'

// ============================================================
// Estados de una venta: presupuesto → enviado → pedido (o cancelado)
// Gris por defecto; el pedido en verde y lo cancelado en rojo
// ============================================================

export const ESTADOS_VENTA: { id: EstadoVenta; texto: string; tono: Tono; ayuda: string }[] = [
  { id: 'presupuesto', texto: 'Presupuesto', tono: 'gris', ayuda: 'Se está preparando y aún no se ha enviado' },
  { id: 'enviado', texto: 'Enviado', tono: 'gris', ayuda: 'El cliente lo tiene y falta que lo acepte' },
  { id: 'pedido', texto: 'Pedido de venta', tono: 'verde', ayuda: 'El cliente lo ha aceptado' },
  { id: 'cancelado', texto: 'Cancelado', tono: 'rojo', ayuda: 'No sigue adelante' },
]

export const estadoVentaInfo = (e: EstadoVenta) => ESTADOS_VENTA.find((x) => x.id === e) ?? ESTADOS_VENTA[0]

export const ESTADOS_VENTA_ABIERTOS: EstadoVenta[] = ['presupuesto', 'enviado']

/** Mientras es un presupuesto se pueden cambiar las líneas y la cabecera */
export const esVentaEditable = (e: EstadoVenta) => ESTADOS_VENTA_ABIERTOS.includes(e)

/** Cambios de estado que admite la base de datos (los mismos que el trigger preparar_venta de ventas.sql) */
const TRANSICIONES_VENTA = ['presupuesto>enviado', 'presupuesto>pedido', 'enviado>pedido', 'presupuesto>cancelado',
  'enviado>cancelado', 'pedido>cancelado', 'cancelado>presupuesto']

export const puedePasarVenta = (de: EstadoVenta, a: EstadoVenta) => TRANSICIONES_VENTA.includes(`${de}>${a}`)

export const CONDICIONES_PAGO: { id: CondicionPago; texto: string }[] = [
  { id: 'contado', texto: 'Al contado' },
  { id: '15_dias', texto: '15 días' },
  { id: '30_dias', texto: '30 días' },
  { id: '60_dias', texto: '60 días' },
]

export const condicionPagoTexto = (c: CondicionPago) => CONDICIONES_PAGO.find((x) => x.id === c)?.texto ?? c

// ============================================================
// Catálogo de productos y servicios
// ============================================================

/** Tipos de IVA permitidos (los mismos que el CHECK de la base de datos) */
export const TIPOS_IVA = [21, 10, 4, 0]

export const TIPOS_SERVICIO: { id: TipoServicio; texto: string }[] = [
  { id: 'servicio', texto: 'Servicio' },
  { id: 'producto', texto: 'Producto' },
]

export const CATEGORIAS = ['Accesorios', 'Alimentación', 'Cirugía', 'Consultas', 'Granjas', 'Identificación', 'Medicamentos', 'Peluquería', 'Pruebas', 'Vacunas']

// ============================================================
// Número e importes (igual que en la base de datos)
// ============================================================

/** 12 → "V-0012" */
export const codigoVenta = (n: number) => `V-${String(n).padStart(4, '0')}`

/** Redondea a céntimos sin los fallos de los decimales (1.005 → 1.01) */
const redondear2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100

/** Subtotal sin IVA (con el descuento) e IVA de una línea, redondeados como en la base de datos */
export function calcularLinea(l: Pick<LineaVenta, 'cantidad' | 'precio_unitario' | 'descuento' | 'iva'>) {
  const subtotal = redondear2(Number(l.cantidad) * Number(l.precio_unitario) * (1 - Number(l.descuento) / 100))
  return { subtotal, iva: redondear2((subtotal * Number(l.iva)) / 100) }
}

/** Cantidad de una línea: 2 o 2,50 (sin decimales si es entera) */
export const formatCantidad = (n: number) => formatNumero(Number(n), Number.isInteger(Number(n)) ? 0 : 2)

/** Precio con IVA de un producto del catálogo (una unidad, redondeado como una línea de venta) */
export function precioConIva(s: Pick<Servicio, 'precio_base' | 'iva'>) {
  const c = calcularLinea({ cantidad: 1, precio_unitario: s.precio_base, descuento: 0, iva: s.iva })
  return redondear2(c.subtotal + c.iva)
}

/** Base imponible, IVA y total de una venta, con el desglose por tipo de IVA (de mayor a menor) */
export function totalesVenta(lineas: Pick<LineaVenta, 'cantidad' | 'precio_unitario' | 'descuento' | 'iva'>[]) {
  const porTipo = new Map<number, { tipo: number; base: number; iva: number }>()
  for (const l of lineas) {
    const c = calcularLinea(l)
    const tipo = Number(l.iva)
    const d = porTipo.get(tipo) ?? { tipo, base: 0, iva: 0 }
    d.base = redondear2(d.base + c.subtotal)
    d.iva = redondear2(d.iva + c.iva)
    porTipo.set(tipo, d)
  }
  const desglose = [...porTipo.values()].sort((a, b) => b.tipo - a.tipo)
  const base = redondear2(desglose.reduce((s, d) => s + d.base, 0))
  const iva = redondear2(desglose.reduce((s, d) => s + d.iva, 0))
  return { base, iva, total: redondear2(base + iva), desglose }
}

/** Presupuesto abierto cuya fecha de validez ya pasó */
export const validezPasada = (v: Pick<Venta, 'estado' | 'fecha_validez'>) =>
  esVentaEditable(v.estado) && diasHasta(v.fecha_validez) < 0

// ============================================================
// Consultas a Supabase que se repiten
// ============================================================

/** Lo que se pide de cada venta en las listas */
export const SELECT_VENTA = `*,
  empresa(id_empresa, nombre, logo),
  particular(id_particular, nombre, apellidos, telefono, correo),
  animal(id_animal, nombre, especie, raza),
  oportunidad(id_oportunidad, titulo, estado),
  responsable:empleado(id_empleado, nombre, apellidos, foto)`

// ============================================================
// Filtros, búsqueda y exportación de las listas de ventas
// ============================================================

/** Opciones del filtro "Comercial": todos, los míos, sin asignar y cada empleado */
export function opcionesComercial(empleados: EmpleadoBreve[], miId?: string | null): Opcion[] {
  return [
    { valor: 'todos', texto: 'Todos' }, ...(miId ? [{ valor: 'mias', texto: 'Míos' }] : []), { valor: 'nadie', texto: 'Sin asignar' },
    ...empleados.map((e) => ({ valor: e.id_empleado, texto: nombreCompleto(e) })),
  ]
}

/** Si la venta pasa el filtro "Comercial" (valores de opcionesComercial) */
export function deComercial(v: Pick<Venta, 'id_responsable_fk'>, filtro: string, miId?: string | null) {
  if (filtro === 'todos') return true
  if (filtro === 'mias') return v.id_responsable_fk === miId
  if (filtro === 'nadie') return !v.id_responsable_fk
  return v.id_responsable_fk === filtro
}

/** Busca por número ("V-12", "12", "V-0012"), cliente o animal. `q` ya viene normalizado. */
export function coincideVenta(v: Venta, q: string) {
  if (!q) return true
  const numero = q.replace(/^v-?/, '')
  if (/^\d+$/.test(numero) && Number(numero) === v.numero) return true
  return normalizar(`${codigoVenta(v.numero)} ${nombreCliente(v)} ${v.animal?.nombre ?? ''}`).includes(q)
}

/** Si una fecha cae en el mes actual (0), en el anterior (-1)…, en hora local */
export function enMes(valor: string | null, desplazamiento: number) {
  if (!valor) return false
  const d = aFecha(valor)
  const ref = new Date()
  ref.setDate(1)
  ref.setMonth(ref.getMonth() + desplazamiento)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

/** Columnas comunes del CSV de presupuestos y pedidos */
export const filaCSVVenta = (v: Venta) => ({
  'Número': codigoVenta(v.numero), Estado: estadoVentaInfo(v.estado).texto, Cliente: nombreCliente(v), Animal: v.animal?.nombre ?? '',
  Comercial: nombreCompleto(v.responsable), Fecha: formatDia(v.fecha), Validez: formatDia(v.fecha_validez),
  'Base imponible': v.base_imponible, IVA: v.importe_iva, Total: v.total,
})
