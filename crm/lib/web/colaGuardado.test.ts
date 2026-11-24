import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { crearColaGuardado, type EstadoGuardado } from './colaGuardado'

let estados: EstadoGuardado[]
let errores: unknown[]

beforeEach(() => {
  vi.useFakeTimers()
  estados = []
  errores = []
})
afterEach(() => vi.useRealTimers())

const nueva = (onError?: (e: unknown) => void) =>
  crearColaGuardado({
    espera: 1000,
    reintento: 5000,
    onEstado: (e) => estados.push(e),
    onError: onError ?? ((e) => errores.push(e)),
  })

test('debounces per key: only the last save of a key runs', async () => {
  const cola = nueva()
  const a = vi.fn(async () => {})
  const b = vi.fn(async () => {})
  cola.programar('bloque:1', a)
  await vi.advanceTimersByTimeAsync(500)
  cola.programar('bloque:1', b)
  expect(estados.at(-1)).toBe('guardando')
  await vi.advanceTimersByTimeAsync(999)
  expect(b).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)
  expect(a).not.toHaveBeenCalled()
  expect(b).toHaveBeenCalledOnce()
  expect(estados.at(-1)).toBe('guardado')
})

test('vaciar runs every pending save at once', async () => {
  const cola = nueva()
  const a = vi.fn(async () => {})
  const b = vi.fn(async () => {})
  cola.programar('bloque:1', a)
  cola.programar('web', b)
  await cola.vaciar()
  expect(a).toHaveBeenCalledOnce()
  expect(b).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(2000)
  expect(a).toHaveBeenCalledOnce()
})

test('saves of the same key never overlap', async () => {
  const cola = nueva()
  const orden: string[] = []
  let terminar = () => {}
  cola.programar('web', () => new Promise<void>((r) => { orden.push('inicio 1'); terminar = () => { orden.push('fin 1'); r() } }))
  void cola.vaciar()
  cola.programar('web', async () => { orden.push('inicio 2') })
  const segundo = cola.vaciar()
  await vi.advanceTimersByTimeAsync(0)
  expect(orden).toEqual(['inicio 1'])
  terminar()
  await segundo
  expect(orden).toEqual(['inicio 1', 'fin 1', 'inicio 2'])
})

test('vaciar also waits for a save that is already running', async () => {
  const cola = nueva()
  let terminar = () => {}
  let vaciado = false
  cola.programar('bloque:1', () => new Promise<void>((r) => { terminar = r }))
  await vi.advanceTimersByTimeAsync(1000)
  const promesa = cola.vaciar().then(() => { vaciado = true })
  await vi.advanceTimersByTimeAsync(0)
  expect(vaciado).toBe(false)
  terminar()
  await promesa
  expect(vaciado).toBe(true)
})

test('cancelar drops a pending save', async () => {
  const cola = nueva()
  const a = vi.fn(async () => {})
  cola.programar('bloque:1', a)
  cola.cancelar('bloque:1')
  await vi.advanceTimersByTimeAsync(2000)
  expect(a).not.toHaveBeenCalled()
  expect(estados.at(-1)).toBe('guardado')
})

test('a failed save reports the error and retries later', async () => {
  const cola = nueva()
  const guardar = vi.fn().mockRejectedValueOnce(new Error('red')).mockResolvedValue(undefined)
  cola.programar('web', guardar)
  await vi.advanceTimersByTimeAsync(1000)
  expect(errores).toHaveLength(1)
  expect(estados.at(-1)).toBe('error')
  await vi.advanceTimersByTimeAsync(5000)
  expect(guardar).toHaveBeenCalledTimes(2)
  expect(estados.at(-1)).toBe('guardado')
})

test('the status stays error while any key is failing', async () => {
  const cola = nueva()
  cola.programar('bloque:1', vi.fn().mockRejectedValue(new Error('red')))
  cola.programar('bloque:2', vi.fn().mockResolvedValue(undefined))
  await vi.advanceTimersByTimeAsync(1000)
  expect(estados.at(-1)).toBe('error')
  cola.cancelar('bloque:1')
  expect(estados.at(-1)).toBe('guardado')
})

test('detener after a final vaciar clears the pending retry', async () => {
  const cola = nueva()
  const guardar = vi.fn().mockRejectedValue(new Error('red'))
  cola.programar('web', guardar)
  await cola.vaciar()
  cola.detener()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(guardar).toHaveBeenCalledOnce()
})

test('detener from onError stops retries and new saves', async () => {
  const cola = nueva(() => cola.detener())
  const guardar = vi.fn().mockRejectedValue(new Error('sin permiso'))
  cola.programar('web', guardar)
  await vi.advanceTimersByTimeAsync(1000)
  cola.programar('bloque:1', guardar)
  await vi.advanceTimersByTimeAsync(10_000)
  expect(guardar).toHaveBeenCalledOnce()
})
