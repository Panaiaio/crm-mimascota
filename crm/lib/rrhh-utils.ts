import type { EstadoCandidato, EstadoVacacion, Fichaje, Tono, Vacacion } from '@/types'
import { aFecha, aISO } from '@/lib/utils'

// ============================================================
// Vacaciones
// ============================================================

export const ESTADOS_VACACION: { id: EstadoVacacion; texto: string; tono: Tono }[] = [
  { id: 'pendiente', texto: 'Pendiente', tono: 'amarillo' },
  { id: 'aprobada', texto: 'Aprobada', tono: 'verde' },
  { id: 'rechazada', texto: 'Rechazada', tono: 'rojo' },
]

export const estadoVacacionInfo = (e: EstadoVacacion) => ESTADOS_VACACION.find((x) => x.id === e) ?? ESTADOS_VACACION[0]

/** Días laborables (lunes a viernes) entre dos fechas, ambas incluidas. Igual que en la base de datos. */
export function diasLaborables(inicio: string, fin: string) {
  if (!inicio || !fin || fin < inicio) return 0
  let n = 0
  const d = aFecha(inicio)
  const f = aFecha(fin)
  while (d <= f) {
    const dia = d.getDay()
    if (dia !== 0 && dia !== 6) n++
    d.setDate(d.getDate() + 1)
  }
  return n
}

/** Resumen de vacaciones del año en curso de un trabajador */
export function saldoVacaciones(diasAnuales: number, vacaciones: Pick<Vacacion, 'estado' | 'dias' | 'fecha_inicio'>[]) {
  const anio = String(new Date().getFullYear())
  const delAnio = vacaciones.filter((v) => v.fecha_inicio.startsWith(anio))
  const aprobados = delAnio.filter((v) => v.estado === 'aprobada').reduce((s, v) => s + v.dias, 0)
  const pendientes = delAnio.filter((v) => v.estado === 'pendiente').reduce((s, v) => s + v.dias, 0)
  return { total: diasAnuales, aprobados, pendientes, disponibles: Math.max(0, diasAnuales - aprobados - pendientes) }
}

/** ¿Está de vacaciones hoy? */
export function deVacacionesHoy(vacaciones: Pick<Vacacion, 'estado' | 'fecha_inicio' | 'fecha_fin'>[]) {
  const hoy = aISO(new Date())
  return vacaciones.some((v) => v.estado === 'aprobada' && v.fecha_inicio <= hoy && v.fecha_fin >= hoy)
}

// ============================================================
// Fichajes
// ============================================================

/** Minutos trabajados en un fichaje (si sigue abierto, hasta ahora) */
export function minutosFichaje(f: Pick<Fichaje, 'entrada' | 'salida'>) {
  const fin = f.salida ? new Date(f.salida).getTime() : Date.now()
  return Math.max(0, Math.round((fin - new Date(f.entrada).getTime()) / 60_000))
}

/** "7 h 32 min" */
export function formatDuracion(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Lunes de la semana actual (AAAA-MM-DD) */
export function lunesDeEstaSemana() {
  const d = new Date()
  const dia = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dia)
  return aISO(d)
}

// ============================================================
// Selección
// ============================================================

export const ESTADOS_CANDIDATO: { id: EstadoCandidato; texto: string; tono: Tono }[] = [
  { id: 'recibido', texto: 'CV recibido', tono: 'gris' },
  { id: 'entrevista', texto: 'Entrevista', tono: 'gris' },
  { id: 'oferta', texto: 'Oferta', tono: 'gris' },
  { id: 'contratado', texto: 'Contratado', tono: 'verde' },
  { id: 'descartado', texto: 'Descartado', tono: 'gris' },
]

export const estadoCandidatoInfo = (e: EstadoCandidato) => ESTADOS_CANDIDATO.find((x) => x.id === e) ?? ESTADOS_CANDIDATO[0]

// ============================================================
// Evaluaciones y nóminas
// ============================================================

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function trimestreActual() {
  const d = new Date()
  return { anio: d.getFullYear(), trimestre: Math.floor(d.getMonth() / 3) + 1 }
}

/** T3 2026 */
export const textoTrimestre = (anio: number, trimestre: number) => `T${trimestre} ${anio}`

/** Ruta del PDF de una nómina dentro del bucket 'nominas' */
export const rutaNomina = (idEmpleado: string, anio: number, mes: number) =>
  `${idEmpleado}/${anio}-${String(mes).padStart(2, '0')}-${Date.now()}.pdf`

export const DEPARTAMENTOS = ['Dirección', 'Clínica', 'Peluquería', 'Atención al cliente', 'Administración']
