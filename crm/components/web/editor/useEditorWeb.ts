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
  /** Live collaboration: the user wants to select a block, the settings or nothing; false = someone else holds it */
  onSeleccionar: (s: Seleccion) => boolean
  /** Live collaboration: local content change, before it is saved */
  onCambioContenido: (id: string, contenido: Contenido) => void
  /** Live collaboration: local change of name, palette or settings, before it is saved */
  onCambioWeb: (web: Web) => void
  /**
   * Live collaboration: a write was rejected (zero rows). Finds out why (block deleted,
   * role changed) and handles it; resolves false when it was neither, so the error is shown.
   */
  onSinPermiso: (idBloque: string | null) => Promise<boolean>
}

const ESPERA_MS = 1000
const REINTENTO_MS = 5000
const PREFIJO_BLOQUE = 'bloque:'
const claveBloque = (id: string) => `${PREFIJO_BLOQUE}${id}`

/**
 * All the editor state and its writes in one place. Content edits show at once
 * and are saved debounced per block; structural changes go straight to the
 * database. `reemplazarWeb` / `reemplazarBloques` apply changes made elsewhere.
 */
export function useEditorWeb({ web, bloques, rol, onSeleccionar, onCambioContenido, onCambioWeb, onSinPermiso }: OpcionesEditor) {
  const { aviso, confirmar } = useAviso()
  const [estado, setEstado] = useState(() => estadoInicial(web, bloques, rol))
  // Latest state for callbacks and for saves that run later (never read during render)
  const actual = useRef(estado)

  const despachar = (a: AccionEditor) => {
    actual.current = reducirEditor(actual.current, a)
    setEstado(actual.current)
  }

  // The queue is created on first use, from event handlers only (never during render)
  const colaRef = useRef<ColaGuardado | null>(null)

  const esSinPermiso = (e: unknown) => e instanceof Error && e.message === SIN_PERMISO

  function cola(): ColaGuardado {
    colaRef.current ??= crearColaGuardado({
      espera: ESPERA_MS,
      reintento: REINTENTO_MS,
      onEstado: (guardado) => despachar({ tipo: 'guardado', guardado }),
      onError: (e, clave) => {
        // One message per run of failures; the queue keeps retrying
        const primero = actual.current.guardado !== 'error'
        if (!esSinPermiso(e)) {
          if (primero) aviso(`No se ha podido guardar. ${errorLegible(e)}`, 'error')
          return
        }
        const id = clave.startsWith(PREFIJO_BLOQUE) ? clave.slice(PREFIJO_BLOQUE.length) : null
        void onSinPermiso(id).then((resuelto) => {
          if (!resuelto && primero) aviso('No se ha podido guardar. Vuelve a intentarlo en un momento.', 'error')
        })
      },
    })
    return colaRef.current
  }

  function manejarError(e: unknown, idBloque: string | null) {
    if (!esSinPermiso(e)) return aviso(errorLegible(e), 'error')
    void onSinPermiso(idBloque).then((resuelto) => {
      if (!resuelto) aviso('No se ha podido hacer el cambio. Vuelve a intentarlo en un momento.', 'error')
    })
  }

  /** Drops pending saves and retries (read-only, or leaving the site); the next edit starts a new queue */
  function detenerGuardado() {
    colaRef.current?.detener()
    colaRef.current = null
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
      // Last write when leaving, then no more retries; a remount creates a new queue
      const c = colaRef.current
      colaRef.current = null
      if (c) void c.vaciar().finally(() => c.detener())
    }
  }, [])

  const puedeEditar = estado.rol !== 'lector'
  const puede = () => actual.current.rol !== 'lector'

  function programarBloque(id: string) {
    cola().programar(claveBloque(id), async () => {
      const b = actual.current.bloques.find((x) => x.id_bloque === id)
      if (b) await guardarContenido(id, b.contenido)
    })
  }

  /** False when someone else holds `s` (live collaboration lock) */
  function seleccionar(s: Seleccion): boolean {
    if (s === actual.current.seleccion) return true
    if (!onSeleccionar(s)) return false
    void cola().vaciar()
    despachar({ tipo: 'seleccion', seleccion: s })
    return true
  }

  /** `actualizar` receives the latest content, so late callers (uploads, "Deshacer") never undo newer edits */
  function editarBloque(id: string, actualizar: (c: Contenido) => Contenido) {
    const b = actual.current.bloques.find((x) => x.id_bloque === id)
    if (!puede() || !b) return
    const contenido = actualizar(b.contenido)
    despachar({ tipo: 'contenido', id, contenido })
    onCambioContenido(id, contenido)
    programarBloque(id)
  }

  /** Site name, settings and palette: always edited with "ajustes" selected (live collaboration locks it as one unit) */
  function editarWeb(actualizar: (w: Web) => CambiosWeb) {
    if (!puede() || !seleccionar('ajustes')) return
    despachar({ tipo: 'web', web: { ...actual.current.web, ...actualizar(actual.current.web) } })
    onCambioWeb(actual.current.web)
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
      // The Realtime echo of the insert may have added it already
      despachar({ tipo: 'bloques', bloques: [...actual.current.bloques.filter((b) => b.id_bloque !== nuevo.id_bloque), nuevo] })
      seleccionar(nuevo.id_bloque)
    } catch (e) {
      manejarError(e, null)
    }
  }

  async function mover(id: string, direccion: -1 | 1) {
    // One move at a time: each one starts from the order the previous one wrote
    if (!puede() || actual.current.moviendo) return
    despachar({ tipo: 'moviendo', moviendo: true })
    try {
      const movidos = await moverBloque(actual.current.bloques, id, direccion)
      // Only the order is taken from the result, so edits typed meanwhile are kept
      const orden = new Map(movidos.map((b) => [b.id_bloque, b.orden]))
      despachar({ tipo: 'bloques', bloques: actual.current.bloques.map((b) => ({ ...b, orden: orden.get(b.id_bloque) ?? b.orden })) })
    } catch (e) {
      manejarError(e, id)
    } finally {
      despachar({ tipo: 'moviendo', moviendo: false })
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
    // Deselected first (through seleccionar, so the lock is released): the Realtime echo
    // of the delete must not find it selected and report it as deleted by someone else
    if (actual.current.seleccion === id) seleccionar(null)
    try {
      await borrarBloque(id)
      despachar({ tipo: 'bloques', bloques: actual.current.bloques.filter((x) => x.id_bloque !== id) })
      aviso(`Bloque «${nombre}» eliminado`)
    } catch (e) {
      programarBloque(id)
      manejarError(e, id)
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
    // Live collaboration
    /** Latest state, for callbacks that run outside render */
    leer: () => actual.current,
    /** Apply a site changed elsewhere */
    reemplazarWeb: (w: Web) => despachar({ tipo: 'web', web: w }),
    /** Apply blocks changed elsewhere */
    reemplazarBloques: (b: Bloque[]) => despachar({ tipo: 'bloques', bloques: b }),
    /** A block deleted elsewhere: its pending save must not run (it would hit zero rows) */
    cancelarGuardado: (id: string) => colaRef.current?.cancelar(claveBloque(id)),
    detenerGuardado,
    /** My role changed: a reader's pending saves would be rejected, so they are dropped */
    cambiarRol(r: RolWeb) {
      if (r === 'lector') detenerGuardado()
      despachar({ tipo: 'rol', rol: r })
    },
  }
}

export type EditorWeb = ReturnType<typeof useEditorWeb>
