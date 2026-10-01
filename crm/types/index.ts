// ============================================================
// Tipos de la base de datos (una interfaz por tabla, mismos nombres de columna)
// Los campos marcados como "Joined" solo vienen cuando se piden en el select.
// ============================================================

// ---------- Catálogos ----------

export interface Servicio {
  id_servicio: string
  nombre: string
  precio_base: number
}

export interface TareaInicioPlantilla {
  id_plantilla: string
  descripcion: string
  orden: number
}

// ---------- RRHH ----------

export type Rol = 'admin' | 'empleado'

export interface Empleado {
  id_empleado: string
  nombre: string
  apellidos: string | null
  correo: string
  correo_personal: string | null
  telefono: string | null
  foto: string | null
  puesto: string
  departamento: string | null
  rol: Rol
  dias_vacaciones: number
  fecha_alta: string
  activo: boolean
  id_candidato_fk: string | null
  fecha_creacion: string
}

/** Lo mínimo de un empleado para pintar su avatar y su nombre */
export type EmpleadoBreve = Pick<Empleado, 'id_empleado' | 'nombre' | 'apellidos' | 'foto'>

export interface Fichaje {
  id_fichaje: string
  id_empleado_fk: string
  entrada: string
  salida: string | null
  // Joined
  empleado?: EmpleadoBreve
}

export type EstadoVacacion = 'pendiente' | 'aprobada' | 'rechazada'

export interface Vacacion {
  id_vacacion: string
  id_empleado_fk: string
  fecha_inicio: string
  fecha_fin: string
  dias: number
  motivo: string | null
  estado: EstadoVacacion
  id_revisor_fk: string | null
  comentario_revision: string | null
  fecha_solicitud: string
  fecha_revision: string | null
  // Joined
  empleado?: EmpleadoBreve
  revisor?: EmpleadoBreve | null
}

export interface TareaInicio {
  id_tarea: string
  id_empleado_fk: string
  descripcion: string
  orden: number
  completada: boolean
  fecha_completada: string | null
  id_completada_por_fk: string | null
}

export type EstadoProceso = 'abierto' | 'cerrado'

export interface ProcesoSeleccion {
  id_proceso: string
  puesto: string
  departamento: string | null
  descripcion: string | null
  estado: EstadoProceso
  fecha_creacion: string
  // Joined
  candidato?: Candidato[]
}

export type EstadoCandidato = 'recibido' | 'entrevista' | 'oferta' | 'contratado' | 'descartado'

export interface Candidato {
  id_candidato: string
  id_proceso_fk: string
  nombre: string
  apellidos: string | null
  correo: string
  telefono: string | null
  cv: string | null
  estado: EstadoCandidato
  notas: string | null
  id_empleado_fk: string | null
  fecha_creacion: string
}

export interface Evaluacion {
  id_evaluacion: string
  id_empleado_fk: string
  id_evaluador_fk: string | null
  anio: number
  trimestre: number
  nota: number
  comentario: string
  fecha_creacion: string
  // Joined
  empleado?: EmpleadoBreve
  evaluador?: EmpleadoBreve | null
}

export interface Nomina {
  id_nomina: string
  id_empleado_fk: string
  anio: number
  mes: number
  archivo: string
  importe_neto: number | null
  firmada: boolean
  firma: string | null
  fecha_firma: string | null
  fecha_subida: string
  // Joined
  empleado?: EmpleadoBreve
}

// ---------- CRM ----------

export type TipoCliente = 'nuevo' | 'habitual' | 'convenio'

export interface Empresa {
  id_empresa: string
  nombre: string
  logo: string | null
  sector: string | null
  tipo_cliente: TipoCliente
  cif: string | null
  telefono: string | null
  correo: string | null
  ciudad: string | null
  direccion: string | null
  id_responsable_fk: string | null
  notas: string | null
  fecha_creacion: string
  // Joined
  responsable?: EmpleadoBreve | null
  animal?: AnimalBreve[]
  oportunidad?: Oportunidad[]
}

export interface Particular {
  id_particular: string
  nombre: string
  apellidos: string | null
  telefono: string | null
  correo: string | null
  ciudad: string | null
  notas: string | null
  fecha_creacion: string
  // Joined (los animales llegan a través de la tabla pivote animal_particular)
  animal_particular?: { animal: AnimalBreve }[]
  oportunidad?: Oportunidad[]
}

export type Sexo = 'macho' | 'hembra'

export interface Animal {
  id_animal: string
  nombre: string
  especie: string
  raza: string | null
  sexo: Sexo | null
  fecha_nacimiento: string | null
  microchip: string | null
  foto: string | null
  id_empresa_fk: string | null
  notas: string | null
  fecha_creacion: string
  // Joined
  empresa?: Pick<Empresa, 'id_empresa' | 'nombre' | 'logo'> | null
  animal_particular?: { particular: Pick<Particular, 'id_particular' | 'nombre' | 'apellidos'> }[]
  oportunidad?: Oportunidad[]
}

export type AnimalBreve = Pick<Animal, 'id_animal' | 'nombre' | 'especie' | 'raza'>

export interface AnimalParticular {
  id_animal_particular: string
  id_animal_fk: string
  id_particular_fk: string
}

export type Estado = 'nuevo' | 'contactado' | 'presupuesto' | 'cita' | 'atendido' | 'descartado'
export type Origen = 'web' | 'telefono' | 'email' | 'presencial' | 'manual'

export interface Oportunidad {
  id_oportunidad: string
  titulo: string
  mensaje: string | null
  estado: Estado
  servicio: string | null
  valor: number
  probabilidad: number
  origen: Origen
  id_empresa_fk: string | null
  id_particular_fk: string | null
  id_animal_fk: string | null
  id_responsable_fk: string | null
  nombre_contacto: string | null
  correo_contacto: string | null
  telefono_contacto: string | null
  nombre_animal: string | null
  especie_animal: string | null
  consentimiento: boolean
  fecha_cita: string | null
  hora_cita: string | null
  fecha_seguimiento: string | null
  motivo_descarte: string | null
  fecha_creacion: string
  fecha_actualizacion: string
  // Joined
  empresa?: Pick<Empresa, 'id_empresa' | 'nombre' | 'logo'> | null
  particular?: Pick<Particular, 'id_particular' | 'nombre' | 'apellidos' | 'telefono' | 'correo'> | null
  animal?: AnimalBreve | null
  responsable?: EmpleadoBreve | null
  actividad?: Actividad[]
}

export type TipoActividad = 'nota' | 'llamada' | 'email' | 'cita' | 'estado' | 'sistema'

export interface Actividad {
  id_actividad: string
  id_oportunidad_fk: string
  id_empleado_fk: string | null
  tipo: TipoActividad
  descripcion: string
  fecha: string
  // Joined
  empleado?: EmpleadoBreve | null
}

// ---------- Tipos para la interfaz ----------

/** Color de las etiquetas: verde = bien, amarillo/naranja = en proceso, rojo = mal */
export type Tono = 'gris' | 'azul' | 'verde' | 'amarillo' | 'naranja' | 'rojo' | 'morado' | 'rosa' | 'cian'

export interface Opcion {
  valor: string
  texto: string
}

/** Solo las columnas de la tabla, sin datos unidos (para formularios) */
export type EmpresaBase = Omit<Empresa, 'responsable' | 'animal' | 'oportunidad'>
export type ParticularBase = Omit<Particular, 'animal_particular' | 'oportunidad'>
export type AnimalBase = Omit<Animal, 'empresa' | 'animal_particular' | 'oportunidad'>
