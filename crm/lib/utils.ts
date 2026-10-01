// ============================================================
// Funciones generales de formato (fechas, dinero, nombres…)
// ============================================================

/** Junta clases de Tailwind ignorando las vacías */
export function cn(...clases: (string | false | null | undefined)[]) {
  return clases.filter(Boolean).join(' ')
}

export function nombreCompleto(p?: { nombre: string; apellidos?: string | null } | null) {
  if (!p) return ''
  return [p.nombre, p.apellidos].filter(Boolean).join(' ')
}

export function iniciales(texto: string) {
  const partes = texto.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

/** Quita tildes y pasa a minúsculas para buscar sin importar cómo se escriba */
export function normalizar(texto: string | null | undefined) {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function formatEUR(n: number | null | undefined, decimales = 0) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: decimales, maximumFractionDigits: decimales,
  }).format(Number(n ?? 0))
}

export function formatNumero(n: number) {
  return new Intl.NumberFormat('es-ES').format(n)
}

/** Fecha de hoy en formato AAAA-MM-DD (hora local) */
export function hoyISO() {
  return aISO(new Date())
}

export function aISO(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function sumarDias(fechaISO: string, dias: number) {
  const d = new Date(fechaISO.slice(0, 10) + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return aISO(d)
}

/** Convierte "2026-09-30" o un timestamp en Date sin que la zona horaria cambie el día */
export function aFecha(valor: string) {
  return valor.length === 10 ? new Date(valor + 'T12:00:00') : new Date(valor)
}

/** 30 sept. */
export function formatDia(valor: string | null | undefined) {
  if (!valor) return '—'
  const d = aFecha(valor)
  const hoy = new Date()
  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  if (d.getFullYear() !== hoy.getFullYear()) opciones.year = 'numeric'
  return d.toLocaleDateString('es-ES', opciones)
}

/** 30/09/2026 */
export function formatFecha(valor: string | null | undefined) {
  if (!valor) return '—'
  return aFecha(valor).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** miércoles, 30 de septiembre */
export function formatFechaLarga(valor: string | Date) {
  const d = typeof valor === 'string' ? aFecha(valor) : valor
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** 08:30 (acepta "08:30:00" o un timestamp) */
export function formatHora(valor: string | null | undefined) {
  if (!valor) return ''
  if (/^\d{2}:\d{2}/.test(valor)) return valor.slice(0, 5)
  return new Date(valor).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export function formatFechaHora(valor: string | null | undefined) {
  if (!valor) return '—'
  return `${formatDia(valor)}, ${formatHora(valor)}`
}

/** "hace 5 min", "hace 2 h", "ayer", "hace 3 días"… */
export function haceCuanto(valor: string) {
  const seg = Math.round((Date.now() - new Date(valor).getTime()) / 1000)
  if (seg < 60) return 'ahora mismo'
  const min = Math.round(seg / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  return formatDia(valor)
}

/** Días entre hoy y una fecha (negativo = ya pasó) */
export function diasHasta(fechaISO: string) {
  const a = aFecha(hoyISO()).getTime()
  const b = aFecha(fechaISO.slice(0, 10)).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** "3 años", "5 meses", "2 semanas" */
export function edad(fechaNacimiento: string | null | undefined) {
  if (!fechaNacimiento) return '—'
  const n = aFecha(fechaNacimiento)
  const hoy = new Date()
  let meses = (hoy.getFullYear() - n.getFullYear()) * 12 + (hoy.getMonth() - n.getMonth())
  if (hoy.getDate() < n.getDate()) meses--
  if (meses >= 24) return `${Math.floor(meses / 12)} años`
  if (meses >= 12) return '1 año'
  if (meses >= 1) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`
  const semanas = Math.max(0, Math.floor((hoy.getTime() - n.getTime()) / (7 * 86_400_000)))
  return `${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`
}

/** Descarga un CSV que Excel abre bien (punto y coma y BOM) */
export function descargarCSV(nombreArchivo: string, filas: Record<string, unknown>[]) {
  if (!filas.length) return
  const columnas = Object.keys(filas[0])
  const escapar = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [columnas.join(';'), ...filas.map((f) => columnas.map((c) => escapar(f[c])).join(';'))].join('\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivo}-${hoyISO()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Traduce los errores de Supabase/Postgres a algo que se entienda */
export function errorLegible(error: unknown) {
  const e = error as { message?: string; code?: string } | null
  const msg = e?.message ?? String(error ?? '')
  if (e?.code === '23505' || /duplicate key/.test(msg)) return 'Ya existe un registro con esos datos.'
  if (e?.code === '42501' || /row-level security|permission denied/.test(msg)) return 'No tienes permiso para hacer esto.'
  if (e?.code === '23503' || /foreign key/.test(msg)) return 'No se puede: hay otros datos que dependen de este.'
  if (/Failed to fetch|NetworkError/.test(msg)) return 'No se ha podido conectar con la base de datos.'
  return msg || 'Ha ocurrido un error.'
}

/** Número de 0 a n-1 estable para un texto (para dar color a etiquetas) */
export function hashTexto(texto: string, n: number) {
  let h = 0
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % n
}
