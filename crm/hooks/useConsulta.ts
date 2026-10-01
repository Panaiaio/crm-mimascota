'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { errorLegible } from '@/lib/utils'

/** Devuelve data o lanza el error de una respuesta de Supabase */
export function sinError<T>(respuesta: { data: T | null; error: unknown }): T {
  if (respuesta.error) throw respuesta.error
  return respuesta.data as T
}

/**
 * Carga datos de Supabase al montar la página (y cuando cambian las dependencias).
 * const { datos, cargando, error, recargar } = useConsulta(async (sb) => ..., [id])
 */
export function useConsulta<T>(cargar: (supabase: SupabaseClient) => Promise<T>, dependencias: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    cargar(createClient())
      .then((d) => { if (vivo) { setDatos(d); setError(null) } })
      .catch((e) => { if (vivo) setError(errorLegible(e)) })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { datos, setDatos, cargando, error, recargar }
}
