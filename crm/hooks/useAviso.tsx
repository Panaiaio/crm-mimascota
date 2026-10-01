'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import Modal from '@/components/ui/Modal'
import Icono from '@/components/ui/Icono'
import { cn } from '@/lib/utils'

type TipoAviso = 'exito' | 'error' | 'info'
interface Aviso { id: number; texto: string; tipo: TipoAviso }
interface Confirmacion { titulo: string; texto?: string; boton?: string; peligro?: boolean }

interface Avisos {
  /** Mensaje flotante abajo a la derecha */
  aviso: (texto: string, tipo?: TipoAviso) => void
  /** Pregunta con Aceptar/Cancelar; devuelve true si acepta */
  confirmar: (c: Confirmacion) => Promise<boolean>
}

const AvisosContext = createContext<Avisos | null>(null)

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [pregunta, setPregunta] = useState<Confirmacion | null>(null)
  const resolver = useRef<(v: boolean) => void>(() => {})

  const aviso = useCallback((texto: string, tipo: TipoAviso = 'exito') => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, texto, tipo }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4000)
  }, [])

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
            className="animar-subir pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border border-borde bg-superficie px-4 py-3 text-[13px] text-texto shadow-[var(--sombra)]"
          >
            <span className={cn('inline-flex size-5 shrink-0 items-center justify-center rounded-full text-white', a.tipo === 'exito' ? 'bg-emerald-500' : a.tipo === 'error' ? 'bg-rose-500' : 'bg-zinc-500')}>
              <Icono nombre={a.tipo === 'exito' ? 'check' : a.tipo === 'error' ? 'cerrar' : 'info'} tamano={12} grosor={3} />
            </span>
            {a.texto}
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
            <button type="button" className="btn-secundario" onClick={() => responder(false)}>Cancelar</button>
            <button type="button" autoFocus className={pregunta?.peligro ? 'btn-peligro' : 'btn-primario'} onClick={() => responder(true)}>
              {pregunta?.boton ?? 'Aceptar'}
            </button>
          </>
        }
      >
        {pregunta?.texto && <p className="px-6 py-5 text-[13.5px] leading-relaxed text-texto-2">{pregunta.texto}</p>}
      </Modal>
    </AvisosContext.Provider>
  )
}

export function useAviso() {
  const a = useContext(AvisosContext)
  if (!a) throw new Error('useAviso debe usarse dentro de AvisosProvider')
  return a
}
