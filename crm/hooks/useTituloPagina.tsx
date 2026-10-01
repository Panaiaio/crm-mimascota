'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'

export interface TituloPagina {
  /** Texto grande de la cabecera ("Empresas", "Granja El Soto"…) */
  titulo: string
  /** Sección de la que viene, para el botón de volver ("Empresas" → /empresas) */
  volver?: { texto: string; href: string }
  /** Etiqueta con punto de color al lado del título ("● 12 abiertas") */
  insignia?: ReactNode
}

const TituloContext = createContext<(t: TituloPagina | null) => void>(() => {})

export const TituloProvider = TituloContext.Provider

/** Cada página dice qué título quiere en la cabecera */
export function useTituloPagina(titulo: TituloPagina | null, dependencias: unknown[] = []) {
  const poner = useContext(TituloContext)
  useEffect(() => {
    poner(titulo)
    return () => poner(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias)
}
