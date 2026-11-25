'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { cargarWeb, existeBloque, rolEnWeb, SIN_ACCESO } from '@/lib/web/datos'
import { duenoDelBloque, esDelDueno, leerPresencias, type Presencia } from '@/lib/web/presencia'
import { aplicarBloque, bloqueActualizado, comoBloque, fusionarBloques, fusionarWeb } from '@/lib/web/fusion'
import { leerAjustes, leerContenido } from '@/lib/web/mensajes'
import { crearLimitador } from '@/lib/web/limitar'
import type { Seleccion } from '@/lib/web/estadoEditor'
import type { Bloque, RolWeb, Web } from '@/lib/web/tipos'
import type { EditorWeb } from '@/components/web/editor/useEditorWeb'
import { useAviso } from './useAviso'

type Contenido = Record<string, unknown>
type Colaborador = { id_web_fk: string; id_empleado_fk: string }
export type Yo = { id_empleado: string; nombre: string; esAdmin: boolean }

/** Typing reaches the others at most this often (the last change always goes out) */
const ENVIO_MS = 300
/** My "last edit" time in presence is refreshed at most this often */
const ACTIVIDAD_MS = 30_000
/** How often the 2-minute idle rule is re-evaluated without presence events */
const RELOJ_MS = 15_000
/** Same message not repeated while it is still on screen */
const AVISO_MS = 6000

const ACCESO_PERDIDO = 'Ya no tienes acceso a esta web'
const SIN_CONEXION = 'Sin conexión en vivo: espera a que vuelva para editar'
const CONECTANDO = 'Conectando con las demás personas: espera un momento para editar'

/** The live channel: locks are only trusted while it is 'conectado' */
type Conexion = 'conectando' | 'conectado' | 'sin_conexion'

// sb.channel() returns a channel that is still being removed (same topic) until the
// server confirms; a remount (Strict Mode, Fast Refresh) waits for that removal.
const cerrando = new Map<string, Promise<unknown>>()

/** Throttle key of what I am typing in */
const claveEnvio = (s: string) => (s === 'ajustes' ? 'ajustes' : `bloque:${s}`)

/**
 * Live collaboration in the editor over the private Realtime channel `web:<id>`:
 * presence (avatars and locks), typing broadcast every ~300 ms, database
 * changes from the others (postgres_changes), and my role changing.
 * `ed` is the editor state (useEditorWeb); remote changes are applied to it.
 */
export function useColaboracion(ed: EditorWeb, yo: Yo) {
  const idWeb = ed.estado.web.id_web
  const { aviso } = useAviso()
  const router = useRouter()
  // For rendering (avatars, locks); handlers read the ref, which is always the latest
  const [presentes, setPresentes] = useState<Presencia[]>([])
  const lista = useRef<Presencia[]>([])
  // Clock for the idle rule; it moves on presence syncs and on a timer
  const [ahora, setAhora] = useState(0)
  const canal = useRef<RealtimeChannel | null>(null)
  const limitador = useRef<ReturnType<typeof crearLimitador> | null>(null)
  const montado = useRef(false)
  /** This browser tab (the same employee may have the site open in two tabs) */
  const [tab] = useState(() => crypto.randomUUID())
  /** What I last tracked; used instead of my own entry in the presence state, which may lag */
  const mia = useRef<Presencia | null>(null)
  /** Reconnected: the first presence sync decides what I keep, then the site is reloaded */
  const recargaPendiente = useRef(false)
  const comprobando = useRef<Promise<RolWeb | null | undefined> | null>(null)
  const saliendo = useRef(false)
  const ultimoAviso = useRef({ texto: '', t: 0 })
  // State for rendering ("Sin conexión en vivo"); handlers read the ref
  const [conexion, setConexion] = useState<Conexion>('conectando')
  const conexionRef = useRef<Conexion>('conectando')

  function marcarConexion(c: Conexion) {
    conexionRef.current = c
    setConexion(c)
  }

  function avisar(texto: string, tipo: 'info' | 'error' | 'exito' = 'info') {
    const t = Date.now()
    if (ultimoAviso.current.texto === texto && t - ultimoAviso.current.t < AVISO_MS) return
    ultimoAviso.current = { texto, t }
    aviso(texto, tipo)
  }

  /** A tab other than this one holding `bloque`, or null */
  function otroDueno(presencias: Presencia[], bloque: string, t: number) {
    const d = duenoDelBloque(presencias, bloque, t)
    return d && d.tab !== tab ? d : null
  }

  const sinMi = (presencias: Presencia[]) => presencias.filter((p) => p.tab !== tab)
  /** The presence list with my entry replaced by what I last tracked */
  const conMia = (presencias: Presencia[]) => (mia.current ? [...sinMi(presencias), mia.current] : presencias)

  /** What I am editing (a block id or 'ajustes'); a reader never holds anything */
  function retenido(): Seleccion {
    const { seleccion, rol } = ed.leer()
    return rol === 'lector' ? null : seleccion
  }

  function seguir(bloque: Seleccion, desde: number, activo = Date.now()) {
    const { rol } = ed.leer()
    mia.current = {
      id_empleado: yo.id_empleado,
      nombre: yo.nombre,
      rol,
      esAdmin: yo.esAdmin,
      tab,
      bloque: rol === 'lector' ? null : bloque,
      desde,
      activo,
    }
    void canal.current?.track(mia.current)
  }

  function marcarActivo() {
    const m = mia.current
    if (m && Date.now() - m.activo >= ACTIVIDAD_MS) seguir(m.bloque, m.desde)
  }

  function enviar(evento: 'contenido' | 'ajustes', clave: string, payload: object) {
    marcarActivo()
    const mensaje = { ...payload, id_empleado: yo.id_empleado, tab }
    limitador.current?.ejecutar(clave, () => void canal.current?.send({ type: 'broadcast', event: evento, payload: mensaje }))
  }

  /** Called by the editor before it selects `s`: false (with a message) when someone else holds it */
  function seleccionar(s: Seleccion): boolean {
    // Without the live channel nobody's locks are known: no new selection (a reader holds nothing)
    if (s !== null && ed.leer().rol !== 'lector' && conexionRef.current !== 'conectado') {
      avisar(conexionRef.current === 'conectando' ? CONECTANDO : SIN_CONEXION)
      return false
    }
    if (s !== null) {
      const otro = otroDueno(sinMi(lista.current), s, Date.now())
      if (otro) {
        avisar(`Lo está editando ${otro.nombre}`)
        return false
      }
    }
    // My last typing reaches the others before the lock is released
    const previa = mia.current?.bloque
    if (previa && previa !== s) limitador.current?.vaciar(claveEnvio(previa))
    seguir(s, Date.now())
    return true
  }

  /** I lost what I had selected: its pending save and typing are dropped, not written over the new holder */
  function perder() {
    const sel = ed.leer().seleccion
    if (sel !== null) limitador.current?.cancelar(claveEnvio(sel))
    ed.soltar()
  }

  /** After a presence change: if someone else won what I have selected, I give it up */
  function revisarSeleccion(presencias: Presencia[]) {
    const sel = retenido()
    if (sel === null) return
    const otro = otroDueno(conMia(presencias), sel, Date.now())
    if (!otro) return
    perder()
    avisar(`Lo está editando ${otro.nombre}`)
  }

  function salir(texto: string) {
    if (saliendo.current) return
    saliendo.current = true
    limitador.current?.cancelar()
    ed.detenerGuardado()
    aviso(texto, 'error')
    router.push('/web')
  }

  function aplicarRol(nuevo: RolWeb | null) {
    if (nuevo === null) return salir(ACCESO_PERDIDO)
    const anterior = ed.leer().rol
    if (nuevo === anterior) return
    if (nuevo === 'lector') limitador.current?.cancelar()
    ed.cambiarRol(nuevo)
    if (nuevo === 'lector') avisar('Ahora eres lector: puedes ver la web pero no cambiarla')
    else if (anterior === 'lector') avisar('Ya puedes editar', 'exito')
    // Presence carries the role: a reader releases its lock, an editor takes what it has selected
    seguir(ed.leer().seleccion, Date.now())
    revisarSeleccion(lista.current)
  }

  /** Asks the database for my role and applies it; undefined when it could not be asked */
  function comprobarRol(): Promise<RolWeb | null | undefined> {
    comprobando.current ??= rolEnWeb(idWeb)
      .then((r) => {
        if (montado.current) aplicarRol(r)
        return r
      })
      .catch(() => undefined)
      .finally(() => {
        comprobando.current = null
      })
    return comprobando.current
  }

  /** A block deleted elsewhere */
  function quitarBloque(id: string) {
    const { bloques, seleccion } = ed.leer()
    if (!bloques.some((b) => b.id_bloque === id)) return
    ed.cancelarGuardado(id)
    if (seleccion === id) {
      perder()
      avisar('Otra persona ha eliminado este bloque')
    }
    ed.reemplazarBloques(ed.leer().bloques.filter((b) => b.id_bloque !== id))
  }

  function aplicarWeb(cambios: Partial<Web>) {
    const { web } = ed.leer()
    const nueva = fusionarWeb(web, cambios, retenido() === 'ajustes')
    if (nueva !== web) ed.reemplazarWeb(nueva)
  }

  function aplicarFila(remoto: Bloque, nuevo = false) {
    const { bloques } = ed.leer()
    const nuevos = aplicarBloque(bloques, remoto, retenido(), nuevo)
    if (nuevos !== bloques) ed.reemplazarBloques(nuevos)
  }

  /**
   * A write was rejected (zero rows): the block was deleted, or my role changed.
   * Resolves true when that was handled here, false when the error should be shown.
   */
  async function alPerderPermiso(idBloque: string | null): Promise<boolean> {
    // The editor is closing (last flush), or the block is already gone here
    if (!montado.current) return true
    if (idBloque && !ed.leer().bloques.some((b) => b.id_bloque === idBloque)) return true
    const [rol, existe] = await Promise.all([comprobarRol(), idBloque ? existeBloque(idBloque).catch(() => true) : true])
    if (rol === undefined) return false
    if (rol === null || rol === 'lector') return true
    if (idBloque && !existe) {
      quitarBloque(idBloque)
      return true
    }
    return false
  }

  /** After a reconnect: the database copy, keeping only what I still hold with its unsaved edits */
  async function recargar() {
    try {
      const datos = await cargarWeb(idWeb)
      if (!montado.current) return
      aplicarRol(datos.rol)
      const { bloques } = ed.leer()
      const nuevos = fusionarBloques(bloques, datos.bloques, retenido())
      for (const b of bloques) if (!nuevos.some((n) => n.id_bloque === b.id_bloque)) quitarBloque(b.id_bloque)
      ed.reemplazarBloques(nuevos)
      aplicarWeb(datos.web)
    } catch (e) {
      if (e instanceof Error && e.message === SIN_ACCESO) salir(ACCESO_PERDIDO)
      // Any other error: keep working with what is on screen; the next reconnect tries again
    }
  }

  const alSincronizar = useEffectEvent((presencias: Presencia[]) => {
    lista.current = presencias
    setPresentes(presencias)
    setAhora(Date.now())
    if (!recargaPendiente.current) return revisarSeleccion(presencias)
    recargaPendiente.current = false
    // First sync after a reconnect: I keep my selection only if I still hold it
    const sel = retenido()
    if (sel !== null && duenoDelBloque(conMia(presencias), sel, Date.now())?.tab !== tab) {
      const otro = otroDueno(conMia(presencias), sel, Date.now())
      perder()
      avisar(otro ? `Lo está editando ${otro.nombre}` : 'Se ha recuperado la conexión. Vuelve a seleccionar lo que estabas editando.')
    }
    void recargar()
  })
  const alConectar = useEffectEvent((trasCaida: boolean) => {
    const m = mia.current
    if (trasCaida) {
      // Back after a drop: my lock priority is gone (desde = now) and my real last edit counts
      seguir(retenido(), Date.now(), m?.activo)
      recargaPendiente.current = true
    } else {
      seguir(retenido(), m?.desde ?? Date.now())
      void comprobarRol()
    }
  })
  // Typing of others is applied only when its sender is the current holder of that block
  const alContenido = useEffectEvent((payload: unknown) => {
    const m = leerContenido(payload)
    if (!m || m.id_bloque === retenido() || !esDelDueno(lista.current, m.id_bloque, m.tab, Date.now())) return
    const b = ed.leer().bloques.find((x) => x.id_bloque === m.id_bloque)
    if (b) aplicarFila({ ...b, contenido: m.contenido })
  })
  const alAjustes = useEffectEvent((payload: unknown) => {
    const m = leerAjustes(payload)
    if (!m || retenido() === 'ajustes' || !esDelDueno(lista.current, 'ajustes', m.tab, Date.now())) return
    aplicarWeb(m.cambios)
  })
  const alInsertarBloque = useEffectEvent((fila: Bloque) => aplicarFila(comoBloque(fila), true))
  const alActualizarBloque = useEffectEvent((fila: Bloque) => aplicarFila(bloqueActualizado(fila, yo.id_empleado)))
  const alBorrarBloque = useEffectEvent((id: string) => quitarBloque(id))
  const alFilaWeb = useEffectEvent((fila: Web) => {
    const dueno = ed.leer().web.id_dueno_fk
    aplicarWeb(fila)
    // A new owner (only an admin changes it): my role may have changed
    if (fila.id_dueno_fk !== dueno) void comprobarRol()
  })
  const alBorrarWeb = useEffectEvent(() => salir('Otra persona ha eliminado esta web'))
  // Any change to my collaborator row: the database says what my role is now (an owner
  // change deletes the new owner's row, so the event type alone is misleading)
  const alColaborador = useEffectEvent((fila: Partial<Colaborador>) => {
    if (fila.id_empleado_fk === yo.id_empleado) void comprobarRol()
  })

  useEffect(() => {
    const sb = createClient()
    const tema = `web:${idWeb}`
    const lim = crearLimitador(ENVIO_MS)
    limitador.current = lim
    montado.current = true
    let vivo = true
    let ch: RealtimeChannel | null = null
    // A failed or closed subscription: the next SUBSCRIBED reloads from the database
    let caido = false
    conexionRef.current = 'conectando'
    const filtro = `id_web_fk=eq.${idWeb}`

    void (async () => {
      await cerrando.get(tema)
      // Private channel: the join carries my token, checked by the realtime.messages policies.
      // If it fails the channel is still created: its join fails and is retried, and the
      // client sets the token again when the session refreshes.
      try {
        await sb.realtime.setAuth()
      } catch {
        if (!vivo) return
        caido = true
        marcarConexion('sin_conexion')
      }
      if (!vivo) return
      const nuevo = sb.channel(tema, { config: { private: true, presence: { key: yo.id_empleado }, broadcast: { self: false } } })
      ch = nuevo
      canal.current = nuevo
      nuevo
        .on('presence', { event: 'sync' }, () => alSincronizar(leerPresencias(nuevo.presenceState())))
        .on('broadcast', { event: 'contenido' }, ({ payload }) => alContenido(payload))
        .on('broadcast', { event: 'ajustes' }, ({ payload }) => alAjustes(payload))
        .on<Bloque>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'web_bloque', filter: filtro }, (p) => alInsertarBloque(p.new))
        .on<Bloque>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'web_bloque', filter: filtro }, (p) => alActualizarBloque(p.new))
        // DELETE events cannot be filtered and carry only the primary key: ids not loaded here are ignored
        .on<Bloque>('postgres_changes', { event: 'DELETE', schema: 'public', table: 'web_bloque' }, (p) => {
          if (p.old.id_bloque) alBorrarBloque(p.old.id_bloque)
        })
        .on<Web>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'web', filter: `id_web=eq.${idWeb}` }, (p) => alFilaWeb(p.new))
        .on<Web>('postgres_changes', { event: 'DELETE', schema: 'public', table: 'web' }, (p) => {
          if (p.old.id_web === idWeb) alBorrarWeb()
        })
        .on<Colaborador>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'web_colaborador', filter: filtro }, (p) => alColaborador(p.new))
        .on<Colaborador>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'web_colaborador', filter: filtro }, (p) => alColaborador(p.new))
        .on<Colaborador>('postgres_changes', { event: 'DELETE', schema: 'public', table: 'web_colaborador' }, (p) => {
          if (p.old.id_web_fk === idWeb) alColaborador(p.old)
        })
        .subscribe((s) => {
          // CLOSED after the cleanup below is our own doing
          if (!vivo) return
          if (s === 'SUBSCRIBED') {
            marcarConexion('conectado')
            alConectar(caido)
            caido = false
          } else {
            // CHANNEL_ERROR, TIMED_OUT or CLOSED: the client retries the join
            caido = true
            marcarConexion('sin_conexion')
          }
        })
    })()

    return () => {
      vivo = false
      montado.current = false
      lim.cancelar()
      limitador.current = null
      canal.current = null
      if (ch) {
        const quitado = sb.removeChannel(ch)
        cerrando.set(tema, quitado)
        void quitado.finally(() => {
          if (cerrando.get(tema) === quitado) cerrando.delete(tema)
        })
      }
    }
  }, [idWeb, yo.id_empleado])

  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), RELOJ_MS)
    return () => clearInterval(reloj)
  }, [])

  return {
    /** Everyone in the site right now (one entry per open tab) */
    presentes,
    /** The live channel failed or dropped: locks cannot be checked, so nothing new can be selected */
    sinConexion: conexion === 'sin_conexion',
    seleccionar,
    /** Name of whoever else holds the block (or 'ajustes'), or null when it is free for me */
    bloqueadoPor: (b: string) => otroDueno(presentes, b, ahora)?.nombre ?? null,
    emitirContenido: (id: string, contenido: Contenido) => enviar('contenido', claveEnvio(id), { id_bloque: id, contenido }),
    emitirWeb: ({ nombre, paleta, ajustes }: Web) => enviar('ajustes', claveEnvio('ajustes'), { nombre, paleta, ajustes }),
    alPerderPermiso,
    /** I am deleting the site: no more saves, and its Realtime delete is not reported as someone else's */
    dejarDeEditar() {
      saliendo.current = true
      limitador.current?.cancelar()
      ed.detenerGuardado()
    },
    /** My delete failed: back to normal */
    seguirEditando() {
      saliendo.current = false
    },
  }
}
