'use client'

import Link from 'next/link'
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import Modal from '@/components/ui/Modal'
import Icono from '@/components/ui/Icono'
import { cn } from '@/lib/utils'

type TipoAviso = 'exito' | 'error' | 'info'
/** Acciones del aviso: enlace a lo creado ("Ver") y/o "Deshacer" */
interface ExtraAviso { ver?: string; deshacer?: () => void }
interface Aviso extends ExtraAviso { id: number; texto: string; tipo: TipoAviso }
/**
 * Confirmación: el título nombra el elemento, el texto explica las consecuencias
 * y el botón describe la acción ("Eliminar empresa"), nunca "Aceptar".
 * Con peligro se añade "No se puede deshacer." y el foco empieza en Cancelar.
 * `volver` cambia el texto de "Cancelar" cuando la acción ya se llama así ("Cancelar pedido").
 */
interface Confirmacion { titulo: string; texto?: string; boton: string; peligro?: boolean; volver?: string }

interface Avisos {
  /** Mensaje flotante abajo a la derecha */
  aviso: (texto: string, tipo?: TipoAviso, extra?: ExtraAviso) => void
  /** Pregunta con Cancelar y el botón de la acción; devuelve true si se confirma */
  confirmar: (c: Confirmacion) => Promise<boolean>
}

const AvisosContext = createContext<Avisos | null>(null)

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [pregunta, setPregunta] = useState<Confirmacion | null>(null)
  const resolver = useRef<(v: boolean) => void>(() => {})

  const quitar = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), [])
  const aviso = useCallback((texto: string, tipo: TipoAviso = 'exito', extra: ExtraAviso = {}) => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, texto, tipo, ...extra }])
    // Sin límite de tiempo para actuar: los avisos con "Ver" o "Deshacer" se quedan hasta que se cierran
    if (!extra.ver && !extra.deshacer) setTimeout(() => quitar(id), 6000)
  }, [quitar])

  const confirmar = useCallback((c: Confirmacion) => {
    setPregunta(c)
    return new Promise<boolean>((res) => { resolver.current = res })
  }, [])

  const responder = (v: boolean) => {
    setPregunta(null)
    resolver.current(v)
  }

  return (
    <AvisosContext.Provider value={{ aviso, confirmar }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col items-end gap-2">
        {avisos.map((a) => (
          <div
            key={a.id}
            role="status"
            className="animar-subir pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border border-borde bg-superficie py-2 pr-2 pl-4 text-[14px] text-texto shadow-[var(--sombra)]"
          >
            <span className={cn('inline-flex size-5 shrink-0 items-center justify-center rounded-full text-white', a.tipo === 'exito' ? 'bg-emerald-600' : a.tipo === 'error' ? 'bg-rose-600' : 'bg-zinc-600')}>
              <Icono nombre={a.tipo === 'exito' ? 'check' : a.tipo === 'error' ? 'alerta' : 'info'} tamano={12} grosor={3} />
            </span>
            <span className="py-2">{a.texto}</span>
            {a.ver && <Link href={a.ver} onClick={() => quitar(a.id)} className="btn-fantasma ml-auto font-medium text-texto underline underline-offset-4">Ver</Link>}
            {a.deshacer && <button type="button" onClick={() => { a.deshacer?.(); quitar(a.id) }} className="btn-fantasma ml-auto font-medium text-texto underline underline-offset-4">Deshacer</button>}
            {(a.ver || a.deshacer) && <button type="button" onClick={() => quitar(a.id)} className="btn-fantasma w-11 px-0" aria-label="Cerrar aviso"><Icono nombre="cerrar" tamano={14} /></button>}
          </div>
        ))}
      </div>
      <Modal
        abierto={!!pregunta}
        onCerrar={() => responder(false)}
        titulo={pregunta?.titulo ?? ''}
        ancho="sm"
        pie={
          <>
            <button type="button" autoFocus={!!pregunta?.peligro} className="btn-secundario" onClick={() => responder(false)}>{pregunta?.volver ?? 'Cancelar'}</button>
            <button type="button" autoFocus={!pregunta?.peligro} className={pregunta?.peligro ? 'btn-peligro' : 'btn-primario'} onClick={() => responder(true)}>
              {pregunta?.boton}
            </button>
          </>
        }
      >
        {(pregunta?.texto || pregunta?.peligro) && (
          <p className="px-6 py-6 text-[14px] leading-relaxed text-texto-2">
            {pregunta?.texto}{pregunta?.texto && pregunta?.peligro ? ' ' : ''}{pregunta?.peligro && <b className="font-medium text-texto">No se puede deshacer.</b>}
          </p>
        )}
      </Modal>
    </AvisosContext.Provider>
  )
}

export function useAviso() {
  const a = useContext(AvisosContext)
  if (!a) throw new Error('useAviso debe usarse dentro de AvisosProvider')
  return a
}
