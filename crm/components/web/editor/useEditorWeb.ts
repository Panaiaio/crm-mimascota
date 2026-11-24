'use client'

import { useEffect, useRef, useState } from 'react'
import { actualizarWeb, anadirBloque, borrarBloque, guardarContenido, moverBloque, SIN_PERMISO } from '@/lib/web/datos'
import { crearColaGuardado, type ColaGuardado } from '@/lib/web/colaGuardado'
import { estadoInicial, reducirEditor, type AccionEditor, type Seleccion } from '@/lib/web/estadoEditor'
import type { Bloque, RolWeb, TipoBloque, Web } from '@/lib/web/tipos'
import { nombreBloque } from '@/components/web/bloques'
import { errorLegible } from '@/lib/utils'
import { useAviso } from '@/hooks/useAviso'

type Contenido = Record<string, unknown>
export type CambiosWeb = Partial<Pick<Web, 'nombre' | 'paleta' | 'ajustes'>>

export type OpcionesEditor = {
  web: Web
  bloques: Bloque[]
  rol: RolWeb
  /** Hook point (live collaboration): the user selected a block, the settings or nothing */
  onSeleccionar?: (s: Seleccion) => void
  /** Hook point (live collaboration): local content change, before it is saved */
  onCambioContenido?: (id: string, contenido: Contenido) => void
}

const ESPERA_MS = 1000
const REINTENTO_MS = 5000
const claveBloque = (id: string) => `bloque:${id}`

/**
 * All the editor state and its writes in one place. Content edits show at once
 * and are saved debounced per block; structural changes go straight to the
 * database. `reemplazarWeb` / `reemplazarBloques` apply changes made elsewhere.
 */
export function useEditorWeb({ web, bloques, rol, onSeleccionar, onCambioContenido }: OpcionesEditor) {
  const { aviso, confirmar } = useAviso()
  const [estado, setEstado] = useState(() => estadoInicial(web, bloques))
  // Latest state for callbacks and for saves that run later (never read during render)
  const actual = useRef(estado)

  const despachar = (a: AccionEditor) => {
    actual.current = reducirEditor(actual.current, a)
    setEstado(actual.current)
  }

  // The queue is created on first use, from event handlers only (never during render)
  const colaRef = useRef<ColaGuardado | null>(null)

  function perderPermiso() {
    if (actual.current.sinPermiso) return
    despachar({ tipo: 'sinPermiso' })
    colaRef.current?.detener()
    aviso(`${SIN_PERMISO}. Desde ahora solo puedes verla y exportarla.`, 'error')
  }

  const esSinPermiso = (e: unknown) => e instanceof Error && e.message === SIN_PERMISO

  function cola(): ColaGuardado {
    colaRef.current ??= crearColaGuardado({
      espera: ESPERA_MS,
      reintento: REINTENTO_MS,
      onEstado: (guardado) => despachar({ tipo: 'guardado', guardado }),
      onError: (e) => {
        if (esSinPermiso(e)) return perderPermiso()
        // One message per run of failures; the queue keeps retrying
        if (actual.current.guardado !== 'error') aviso(`No se ha podido guardar. ${errorLegible(e)}`, 'error')
      },
    })
    return colaRef.current
  }

  function manejarError(e: unknown) {
    if (esSinPermiso(e)) perderPermiso()
    else aviso(errorLegible(e), 'error')
  }

  // Pending saves are written when the tab is hidden or closed, and when leaving the editor
  useEffect(() => {
    const vaciar = () => void colaRef.current?.vaciar()
    const alOcultar = () => { if (document.visibilityState === 'hidden') vaciar() }
    document.addEventListener('visibilitychange', alOcultar)
    window.addEventListener('pagehide', vaciar)
    return () => {
      document.removeEventListener('visibilitychange', alOcultar)
      window.removeEventListener('pagehide', vaciar)
      vaciar()
    }
  }, [])

  const puedeEditar = rol !== 'lector' && !estado.sinPermiso
  const puede = () => rol !== 'lector' && !actual.current.sinPermiso

  function programarBloque(id: string) {
    cola().programar(claveBloque(id), async () => {
      const b = actual.current.bloques.find((x) => x.id_bloque === id)
      if (b) await guardarContenido(id, b.contenido)
    })
  }

  function seleccionar(s: Seleccion) {
    if (s === actual.current.seleccion) return
    void cola().vaciar()
    despachar({ tipo: 'seleccion', seleccion: s })
    onSeleccionar?.(s)
  }

  /** `actualizar` receives the latest content, so late callers (uploads, "Deshacer") never undo newer edits */
  function editarBloque(id: string, actualizar: (c: Contenido) => Contenido) {
    const b = actual.current.bloques.find((x) => x.id_bloque === id)
    if (!puede() || !b) return
    const contenido = actualizar(b.contenido)
    despachar({ tipo: 'contenido', id, contenido })
    onCambioContenido?.(id, contenido)
    programarBloque(id)
  }

  function editarWeb(actualizar: (w: Web) => CambiosWeb) {
    if (!puede()) return
    despachar({ tipo: 'web', web: { ...actual.current.web, ...actualizar(actual.current.web) } })
    cola().programar('web', async () => {
      const { id_web, nombre, paleta, ajustes } = actual.current.web
      // An empty name is never saved: the field shows an error until it is filled in
      const limpio = nombre.trim()
      await actualizarWeb(id_web, { ...(limpio && { nombre: limpio }), paleta, ajustes })
    })
  }

  /** Adds a block of `tipo` at position `i` of the list (0 = first, length = last) and selects it */
  async function anadir(tipo: TipoBloque, i: number) {
    if (!puede()) return
    const lista = actual.current.bloques
    try {
      const nuevo = await anadirBloque(estado.web.id_web, tipo, lista[i - 1]?.orden ?? null, lista[i]?.orden ?? null)
      despachar({ tipo: 'bloques', bloques: [...actual.current.bloques, nuevo] })
      seleccionar(nuevo.id_bloque)
    } catch (e) {
      manejarError(e)
    }
  }

  async function mover(id: string, direccion: -1 | 1) {
    if (!puede()) return
    try {
      const movidos = await moverBloque(actual.current.bloques, id, direccion)
      // Only the order is taken from the result, so edits typed meanwhile are kept
      const orden = new Map(movidos.map((b) => [b.id_bloque, b.orden]))
      despachar({ tipo: 'bloques', bloques: actual.current.bloques.map((b) => ({ ...b, orden: orden.get(b.id_bloque) ?? b.orden })) })
    } catch (e) {
      manejarError(e)
    }
  }

  async function borrar(id: string) {
    const b = actual.current.bloques.find((x) => x.id_bloque === id)
    if (!puede() || !b) return
    const nombre = nombreBloque(b)
    const ok = await confirmar({
      titulo: `Eliminar bloque «${nombre}»`,
      texto: 'El bloque y todo su contenido desaparecerán de la web para todas las personas que la editan.',
      boton: 'Eliminar bloque',
      peligro: true,
    })
    if (!ok) return
    // No save may land after the row is gone (it would look like a lost permission)
    await cola().vaciar()
    cola().cancelar(claveBloque(id))
    try {
      await borrarBloque(id)
      // Deselect through seleccionar so the onSeleccionar hook hears about it
      if (actual.current.seleccion === id) seleccionar(null)
      despachar({ tipo: 'bloques', bloques: actual.current.bloques.filter((x) => x.id_bloque !== id) })
      aviso(`Bloque «${nombre}» eliminado`)
    } catch (e) {
      programarBloque(id)
      manejarError(e)
    }
  }

  return {
    estado,
    puedeEditar,
    seleccionar,
    editarBloque,
    editarWeb,
    anadir,
    mover,
    borrar,
    /** Hook point (live collaboration): apply a site changed elsewhere */
    reemplazarWeb: (w: Web) => despachar({ tipo: 'web', web: w }),
    /** Hook point (live collaboration): apply blocks changed elsewhere */
    reemplazarBloques: (b: Bloque[]) => despachar({ tipo: 'bloques', bloques: b }),
  }
}

export type EditorWeb = ReturnType<typeof useEditorWeb>
