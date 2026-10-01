'use client'

import { useEffect, type FormEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Icono from './Icono'

const ANCHOS = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

/**
 * Ventana modal como la de "New Company" de la plantilla.
 * Si recibe onSubmit, el contenido y el pie van dentro de un <form>.
 */
export default function Modal({
  abierto,
  onCerrar,
  titulo,
  subtitulo,
  children,
  pie,
  ancho = 'md',
  onSubmit,
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  subtitulo?: string
  children: ReactNode
  pie?: ReactNode
  ancho?: keyof typeof ANCHOS
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void
}) {
  useEffect(() => {
    if (!abierto) return
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [abierto, onCerrar])

  if (!abierto) return null

  const contenido = (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-borde px-6 py-5">
        <div>
          <h2 className="text-[16px] font-semibold text-texto">{titulo}</h2>
          {subtitulo && <p className="mt-1 text-[13px] text-texto-3">{subtitulo}</p>}
        </div>
        <button type="button" onClick={onCerrar} className="-mr-2 rounded-md p-1.5 text-texto-3 hover:bg-hover hover:text-texto" aria-label="Cerrar">
          <Icono nombre="cerrar" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {pie && <div className="flex items-center justify-end gap-2 border-t border-borde px-6 py-4">{pie}</div>}
    </>
  )

  const clases = cn('animar-subir relative flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-2xl border border-borde bg-superficie shadow-[var(--sombra)]', ANCHOS[ancho])

  return (
    <div className="animar-aparecer fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]" onMouseDown={onCerrar}>
      {onSubmit ? (
        <form className={clases} onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSubmit(e) }} role="dialog" aria-modal="true" aria-label={titulo}>
          {contenido}
        </form>
      ) : (
        <div className={clases} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titulo}>
          {contenido}
        </div>
      )}
    </div>
  )
}
