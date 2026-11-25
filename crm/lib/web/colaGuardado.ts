export type EstadoGuardado = 'guardado' | 'guardando' | 'error'

type Opciones = {
  /** Debounce per key (ms) */
  espera: number
  /** Retry delay after a failed save (ms) */
  reintento: number
  onEstado: (estado: EstadoGuardado) => void
  /** `clave` is the key whose save failed */
  onError: (error: unknown, clave: string) => void
}

/**
 * Debounced saves keyed by what they save ("bloque:<id>", "web").
 * A new save for a key replaces the pending one; saves of the same key run one
 * after another so an older write never lands after a newer one. Each save
 * function should read the latest state when it runs.
 */
export function crearColaGuardado({ espera, reintento, onEstado, onError }: Opciones) {
  const pendientes = new Map<string, { guardar: () => Promise<void>; temporizador: ReturnType<typeof setTimeout> }>()
  const cadenas = new Map<string, Promise<void>>()
  let enCurso = 0
  // Keys whose last save failed: the status stays "error" while any of them is failing
  const fallidas = new Set<string>()
  let detenida = false

  const avisar = () => onEstado(fallidas.size ? 'error' : pendientes.size || enCurso ? 'guardando' : 'guardado')

  function programar(clave: string, guardar: () => Promise<void>, ms = espera) {
    if (detenida) return
    const previo = pendientes.get(clave)
    if (previo) clearTimeout(previo.temporizador)
    pendientes.set(clave, { guardar, temporizador: setTimeout(() => void ejecutar(clave), ms) })
    avisar()
  }

  function ejecutar(clave: string): Promise<void> {
    const p = pendientes.get(clave)
    if (!p) return cadenas.get(clave) ?? Promise.resolve()
    clearTimeout(p.temporizador)
    pendientes.delete(clave)
    enCurso++
    avisar()
    const actual = (cadenas.get(clave) ?? Promise.resolve()).then(async () => {
      try {
        await p.guardar()
        fallidas.delete(clave)
      } catch (e) {
        fallidas.add(clave)
        onError(e, clave)
        // onError may have stopped the queue (e.g. permission lost); otherwise retry later
        if (!pendientes.has(clave)) programar(clave, p.guardar, reintento)
      } finally {
        enCurso--
        avisar()
      }
    })
    cadenas.set(clave, actual)
    return actual
  }

  return {
    programar: (clave: string, guardar: () => Promise<void>) => programar(clave, guardar),
    /** Runs every pending save now and resolves when no save is running */
    async vaciar() {
      for (const clave of [...pendientes.keys()]) void ejecutar(clave)
      await Promise.all(cadenas.values())
    },
    /** Drops the pending save of a key (e.g. the block was deleted) */
    cancelar(clave: string) {
      const p = pendientes.get(clave)
      if (!p) return
      clearTimeout(p.temporizador)
      pendientes.delete(clave)
      fallidas.delete(clave)
      avisar()
    },
    /** Drops everything, including retries, and ignores new saves (read-only, or the editor closed) */
    detener() {
      detenida = true
      for (const p of pendientes.values()) clearTimeout(p.temporizador)
      pendientes.clear()
      avisar()
    },
  }
}

export type ColaGuardado = ReturnType<typeof crearColaGuardado>
