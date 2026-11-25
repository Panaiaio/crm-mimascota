/**
 * Throttle per key: the first call runs at once, then at most one call per
 * window, and the latest call of a window runs when it ends (so the last
 * value always goes out).
 */
export function crearLimitador(ms: number) {
  const ventanas = new Map<string, { pendiente: (() => void) | null; temporizador: ReturnType<typeof setTimeout> }>()

  function abrir(clave: string) {
    ventanas.set(clave, { pendiente: null, temporizador: setTimeout(() => cerrar(clave), ms) })
  }

  function cerrar(clave: string) {
    const f = ventanas.get(clave)?.pendiente
    ventanas.delete(clave)
    if (f) {
      f()
      abrir(clave)
    }
  }

  function quitar(clave: string) {
    const v = ventanas.get(clave)
    if (v) clearTimeout(v.temporizador)
    ventanas.delete(clave)
    return v?.pendiente ?? null
  }

  return {
    ejecutar(clave: string, f: () => void) {
      const v = ventanas.get(clave)
      if (v) {
        v.pendiente = f
        return
      }
      f()
      abrir(clave)
    },
    /** Runs the pending call of `clave` now (if any) and closes its window */
    vaciar(clave: string) {
      quitar(clave)?.()
    },
    /** Drops the pending call of `clave`, or of every key */
    cancelar(clave?: string) {
      for (const k of clave === undefined ? [...ventanas.keys()] : [clave]) quitar(k)
    },
  }
}
