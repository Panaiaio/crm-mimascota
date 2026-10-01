'use client'

import { createContext, useContext } from 'react'
import type { Empleado } from '@/types'

export interface Sesion {
  /** Correo con el que ha iniciado sesión */
  correo: string
  /** Su ficha de empleado (null si su correo no está en la tabla empleado) */
  empleado: Empleado | null
  esAdmin: boolean
  recargar: () => void
}

const SesionContext = createContext<Sesion | null>(null)

export const SesionProvider = SesionContext.Provider

/** Usuario que ha iniciado sesión (lo carga AppShell) */
export function useSesion() {
  const s = useContext(SesionContext)
  if (!s) throw new Error('useSesion debe usarse dentro de AppShell')
  return s
}
