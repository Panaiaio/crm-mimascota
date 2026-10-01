'use client'

import { useCallback, useState } from 'react'

/** Filas marcadas con las casillas de una tabla */
export function useSeleccion() {
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())

  const alternar = useCallback((id: string) => {
    setMarcadas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }, [])

  const todas = useCallback((ids: string[], marcar: boolean) => setMarcadas(marcar ? new Set(ids) : new Set()), [])
  const limpiar = useCallback(() => setMarcadas(new Set()), [])

  return { marcadas, alternar, todas, limpiar, n: marcadas.size }
}
