const PASO = 1000
const HUECO_MINIMO = 1e-6

// Fractional position between two neighbours; null means the list edge.
export function ordenEntre(antes: number | null, despues: number | null): number {
  if (antes === null && despues === null) return PASO
  if (despues === null) return antes! + PASO
  if (antes === null) return despues / 2
  return (antes + despues) / 2
}

export function necesitaRenumerar(antes: number, despues: number): boolean {
  return despues - antes < HUECO_MINIMO
}

// Assumes the blocks are already sorted; reassigns 1000, 2000, ...
export function renumerar<T extends { orden: number }>(bloques: T[]): T[] {
  return bloques.map((b, i) => ({ ...b, orden: (i + 1) * PASO }))
}
