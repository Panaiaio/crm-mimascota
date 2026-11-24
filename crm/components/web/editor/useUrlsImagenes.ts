'use client'

import { useEffect, useState } from 'react'
import { RENOVAR_MS as MARGEN_MS, urlImagen } from '@/lib/web/datos'

// urlImagen renews a URL once less than MARGEN_MS is left; asking a minute more
// often than that margin means every URL is renewed before it expires.
const RENOVAR_MS = MARGEN_MS - 60_000

/**
 * Signed URLs for the given storage paths, loaded ahead because the site
 * renderer needs a synchronous resolver. A path whose URL has not arrived yet
 * is missing from the map.
 */
export function useUrlsImagenes(rutas: string[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(() => new Map())
  const [vuelta, setVuelta] = useState(0)
  const clave = rutas.join('\n')

  useEffect(() => {
    const t = setInterval(() => setVuelta((v) => v + 1), RENOVAR_MS)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!clave) return
    let vivo = true
    // urlImagen caches each URL, so asking for paths already loaded is cheap
    Promise.all(clave.split('\n').map((r) => urlImagen(r).then((u) => [r, u] as const, () => null))).then((pares) => {
      if (!vivo) return
      setUrls((antes) => {
        // Most rounds return the cached URLs: keep the same map so nothing re-renders
        const cambios = pares.filter((p) => p && antes.get(p[0]) !== p[1])
        if (!cambios.length) return antes
        const nuevas = new Map(antes)
        for (const p of cambios) if (p) nuevas.set(p[0], p[1])
        return nuevas
      })
    })
    return () => { vivo = false }
  }, [clave, vuelta])

  return urls
}
