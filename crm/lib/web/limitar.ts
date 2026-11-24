/**
 * Throttle per key: the first call runs at once, then at most one call per
 * window, and the latest call of a window runs when it ends (so the last
 * value always goes out).
 */
export function crearLimitador(ms: number) {
  const ventanas = new Map<string, { pendiente: (() => void) | null; temporizador: ReturnType<typeof setTimeout> }>()

  function abrir(clave: string) {
    const v = { pendiente: null as (() => void) | null, temporizador: setTimeout(() => cerrar(clave), ms) }
    ventanas.set(clave, v)
  }

  function cerrar(clave: string) {
    const f = ventanas.get(clave)?.pendiente
    ventanas.delete(clave)
    if (f) {
      f()
      abrir(clave)
    }
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
    /** Drops every pending call */
    cancelar() {
      for (const v of ventanas.values()) clearTimeout(v.temporizador)
      ventanas.clear()
    },
  }
}
