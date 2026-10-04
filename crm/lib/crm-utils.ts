import type { Actividad, Animal, Estado, Oportunidad, Origen, Particular, TipoActividad, TipoCliente, Tono } from '@/types'
import { diasHasta, formatDia, formatHora, nombreCompleto } from '@/lib/utils'

// ============================================================
// Estados de una oportunidad
// Todos en gris; solo "Atendido" en verde (verde = bien, amarillo = aviso, rojo = error)
// ============================================================

export const ESTADOS: { id: Estado; texto: string; tono: Tono; probabilidad: number; ayuda: string }[] = [
  { id: 'nuevo', texto: 'Nuevo', tono: 'gris', probabilidad: 10, ayuda: 'Ha llegado y nadie lo ha contestado' },
  { id: 'contactado', texto: 'Contactado', tono: 'gris', probabilidad: 30, ayuda: 'Ya le hemos llamado o escrito' },
  { id: 'presupuesto', texto: 'Presupuesto', tono: 'gris', probabilidad: 50, ayuda: 'Tiene un presupuesto enviado' },
  { id: 'cita', texto: 'Cita', tono: 'gris', probabilidad: 75, ayuda: 'Tiene día y hora para venir' },
  { id: 'atendido', texto: 'Atendido', tono: 'verde', probabilidad: 100, ayuda: 'Vino y se le atendió' },
  { id: 'descartado', texto: 'Descartado', tono: 'rojo', probabilidad: 0, ayuda: 'No sigue adelante' },
]

export const ESTADOS_ABIERTOS: Estado[] = ['nuevo', 'contactado', 'presupuesto', 'cita']

export function estadoInfo(estado: Estado) {
  return ESTADOS.find((e) => e.id === estado) ?? ESTADOS[0]
}

export const esAbierta = (estado: Estado) => ESTADOS_ABIERTOS.includes(estado)

export const MOTIVOS_DESCARTE = [
  'No contesta',
  'Precio demasiado alto',
  'Se lo lleva a otra clínica',
  'Solo quería información',
  'Ya no lo necesita',
  'Otro',
]

export const ORIGENES: { id: Origen; texto: string }[] = [
  { id: 'web', texto: 'Web' },
  { id: 'telefono', texto: 'Teléfono' },
  { id: 'email', texto: 'Email' },
  { id: 'presencial', texto: 'Presencial' },
  { id: 'manual', texto: 'Manual' },
]

export const origenTexto = (o: Origen) => ORIGENES.find((x) => x.id === o)?.texto ?? o

export const TIPOS_CLIENTE: { id: TipoCliente; texto: string; tono: Tono }[] = [
  { id: 'nuevo', texto: 'Nuevo', tono: 'gris' },
  { id: 'habitual', texto: 'Habitual', tono: 'gris' },
  { id: 'convenio', texto: 'Convenio', tono: 'gris' },
]

export const tipoClienteInfo = (t: TipoCliente) => TIPOS_CLIENTE.find((x) => x.id === t) ?? TIPOS_CLIENTE[0]

export const SECTORES = ['Granja', 'Criadero', 'Protectora', 'Hípica', 'Tienda', 'Residencia', 'Club deportivo', 'Zoológico', 'Otro']

export const ESPECIES_SUGERIDAS = ['perro', 'gato', 'conejo', 'hurón', 'cobaya', 'hámster', 'periquito', 'loro', 'tortuga', 'caballo', 'vaca', 'oveja', 'cabra', 'cerdo', 'gallina']

export const TIPOS_ACTIVIDAD: { id: TipoActividad; texto: string }[] = [
  { id: 'nota', texto: 'Nota' },
  { id: 'llamada', texto: 'Llamada' },
  { id: 'email', texto: 'Email' },
  { id: 'cita', texto: 'Cita' },
  { id: 'estado', texto: 'Cambio de estado' },
  { id: 'sistema', texto: 'Sistema' },
]

export const tipoActividadTexto = (t: TipoActividad) => TIPOS_ACTIVIDAD.find((x) => x.id === t)?.texto ?? t

// ============================================================
// Consultas a Supabase que se repiten
// ============================================================

/** Lo que se pide de cada oportunidad en las listas */
export const SELECT_OPORTUNIDAD = `*,
  empresa(id_empresa, nombre, logo),
  particular(id_particular, nombre, apellidos, telefono, correo),
  animal(id_animal, nombre, especie, raza),
  responsable:empleado(id_empleado, nombre, apellidos, foto),
  actividad(tipo, fecha)`

// ============================================================
// Ayudas para pintar oportunidades
// ============================================================

export function nombreCliente(o: Oportunidad) {
  if (o.empresa) return o.empresa.nombre
  if (o.particular) return nombreCompleto(o.particular)
  return o.nombre_contacto ?? 'Sin cliente'
}

export function enlaceCliente(o: Oportunidad) {
  if (o.id_empresa_fk) return `/empresas/${o.id_empresa_fk}`
  if (o.id_particular_fk) return `/particulares/${o.id_particular_fk}`
  return null
}

/** El siguiente paso de una oportunidad abierta: su cita o su seguimiento */
export function proximoPaso(o: Oportunidad): { texto: string; tipo: 'cita' | 'seguimiento'; vencido: boolean } | null {
  if (!esAbierta(o.estado)) return null
  if (o.fecha_cita && (o.estado === 'cita' || diasHasta(o.fecha_cita) >= 0)) {
    return {
      texto: `${formatDia(o.fecha_cita)}${o.hora_cita ? ' · ' + formatHora(o.hora_cita) : ''}`,
      tipo: 'cita',
      vencido: diasHasta(o.fecha_cita) < 0,
    }
  }
  if (o.fecha_seguimiento) {
    return { texto: formatDia(o.fecha_seguimiento), tipo: 'seguimiento', vencido: diasHasta(o.fecha_seguimiento) < 0 }
  }
  return null
}

/** La última llamada, email, nota o cita (sin contar los cambios automáticos) */
export function ultimaInteraccion(actividades: Pick<Actividad, 'tipo' | 'fecha'>[] | undefined) {
  const reales = (actividades ?? []).filter((a) => a.tipo !== 'estado')
  if (!reales.length) return null
  const ultima = reales.reduce((a, b) => (a.fecha > b.fecha ? a : b))
  return { fecha: ultima.fecha, texto: ultima.tipo === 'sistema' ? 'Alta' : tipoActividadTexto(ultima.tipo) }
}

/** Número de actividades por semana en las últimas n semanas (la última es la actual) */
export function actividadSemanal(fechas: string[], semanas = 10) {
  const cuentas = new Array(semanas).fill(0)
  const ahora = Date.now()
  for (const f of fechas) {
    const semana = Math.floor((ahora - new Date(f).getTime()) / (7 * 86_400_000))
    if (semana >= 0 && semana < semanas) cuentas[semanas - 1 - semana]++
  }
  return cuentas
}

/** Media de probabilidad (0-100) de una lista de oportunidades abiertas */
export function probabilidadMedia(ops: Pick<Oportunidad, 'probabilidad'>[]) {
  if (!ops.length) return 0
  return Math.round(ops.reduce((s, o) => s + (o.probabilidad ?? 0), 0) / ops.length)
}

// ============================================================
// Animales y dueños (la relación N:M llega a través de animal_particular)
// ============================================================

export const SELECT_DUENOS = 'animal_particular(particular(id_particular, nombre, apellidos))'
export const SELECT_ANIMALES_DE_PARTICULAR = 'animal_particular(animal(id_animal, nombre, especie, raza))'

/** Dueños particulares de un animal */
export function duenosDe(a: Pick<Animal, 'animal_particular'>) {
  return (a.animal_particular ?? []).map((x) => x.particular).filter(Boolean)
}

/** Animales de un particular */
export function animalesDe(p: Pick<Particular, 'animal_particular'>) {
  return (p.animal_particular ?? []).map((x) => x.animal).filter(Boolean)
}

/** "Kiko (perro)" */
export const nombreConEspecie = (a: Pick<Animal, 'nombre' | 'especie'>) => `${a.nombre} (${a.especie})`
