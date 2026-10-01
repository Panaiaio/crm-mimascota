'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EmpleadoBreve, Servicio } from '@/types'

type EmpleadoLista = EmpleadoBreve & { puesto: string }

// Se guardan en memoria para no pedirlos otra vez en cada formulario
type Catalogos = { empleados: EmpleadoLista[]; servicios: Servicio[] }
let cache: Catalogos | null = null
let pendiente: Promise<Catalogos> | null = null

async function cargar(): Promise<Catalogos> {
  const sb = createClient()
  const [e, s] = await Promise.all([
    sb.from('empleado').select('id_empleado, nombre, apellidos, foto, puesto').eq('activo', true).order('nombre'),
    sb.from('servicio').select('*').order('nombre'),
  ])
  cache = { empleados: (e.data ?? []) as EmpleadoLista[], servicios: (s.data ?? []) as Servicio[] }
  return cache
}

/** Empleados activos (para elegir responsable) y servicios de la clínica */
export function useCatalogos() {
  const [datos, setDatos] = useState(cache)
  useEffect(() => {
    if (cache) return
    const p = (pendiente ??= cargar())
    p.then(setDatos).finally(() => { pendiente = null })
  }, [])
  return { empleados: datos?.empleados ?? [], servicios: datos?.servicios ?? [] }
}

/** Vacía la memoria (después de crear o editar un empleado) */
export function olvidarCatalogos() {
  cache = null
}
