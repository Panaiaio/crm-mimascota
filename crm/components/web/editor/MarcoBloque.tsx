'use client'

import type { MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Icono from '@/components/ui/Icono'

// Lives inside the site preview: `tokens-crm` brings back the CRM colours for the
// editor controls, and the outline uses the site's own text colour (currentColor),
// which always contrasts with the site background.

const BOTON = 'inline-flex size-11 items-center justify-center rounded-md text-texto-2 hover:bg-hover hover:text-texto disabled:opacity-40 aria-disabled:opacity-40'

/** One block in the preview: focusable, outline on hover/focus, and its actions */
export default function MarcoBloque({
  nombre,
  children,
  seleccionado,
  puedeEditar,
  bloqueadoPor,
  primero,
  ultimo,
  moviendo,
  onSeleccionar,
  onMover,
  onBorrar,
  onAnadirAntes,
}: {
  nombre: string
  children: ReactNode
  seleccionado: boolean
  puedeEditar: boolean
  /** Name of who is editing it (live collaboration); null when free */
  bloqueadoPor: string | null
  primero: boolean
  ultimo: boolean
  /** A move is being saved: the move buttons look disabled (aria-disabled keeps the focus) and clicks are ignored */
  moviendo: boolean
  onSeleccionar: () => void
  onMover: (direccion: -1 | 1) => void
  onBorrar: () => void
  onAnadirAntes: () => void
}) {
  const bloqueado = bloqueadoPor !== null
  const visible = seleccionado ? 'flex' : 'hidden group-hover:flex group-focus-within:flex'
  // Actions must not also select (or deselect) the block underneath
  const accion = (f: () => void) => (e: MouseEvent) => { e.stopPropagation(); f() }

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={bloqueado ? `Bloque ${nombre}. Lo está editando ${bloqueadoPor}` : `Bloque ${nombre}`}
      aria-current={seleccionado || undefined}
      aria-disabled={bloqueado || undefined}
      // A locked block stays focusable: trying to select it announces who is editing it
      onClick={onSeleccionar}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
          e.preventDefault()
          onSeleccionar()
        }
      }}
      className={cn(
        'sitio-marco group relative outline-current -outline-offset-2',
        seleccionado ? 'outline-2 outline-solid' : 'hover:outline-1 hover:outline-dashed focus-visible:outline-2 focus-visible:outline-solid',
        bloqueado ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      {bloqueado ? (
        <span aria-hidden className="tokens-crm absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md border border-borde bg-superficie px-2 py-1 font-sans text-[12.5px] text-texto-2">
          <Icono nombre="candado" tamano={13} /> Editando: {bloqueadoPor}
        </span>
      ) : (
        puedeEditar && (
          <>
            <div className={cn('tokens-crm absolute top-0 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 font-sans', visible)}>
              <button type="button" className="btn-secundario shadow-[var(--sombra)]" onClick={accion(onAnadirAntes)} aria-label={`Añadir bloque antes de «${nombre}»`}>
                <Icono nombre="mas" tamano={14} /> Añadir bloque
              </button>
            </div>
            <div className={cn('tokens-crm absolute top-2 right-2 z-10 gap-1 rounded-lg border border-borde bg-superficie p-1 font-sans shadow-[var(--sombra)]', visible)}>
              <button type="button" className={BOTON} disabled={primero} aria-disabled={moviendo || undefined} onClick={accion(() => onMover(-1))} aria-label={`Subir bloque «${nombre}»`}>
                <Icono nombre="arriba" tamano={16} />
              </button>
              <button type="button" className={BOTON} disabled={ultimo} aria-disabled={moviendo || undefined} onClick={accion(() => onMover(1))} aria-label={`Bajar bloque «${nombre}»`}>
                <Icono nombre="abajo" tamano={16} />
              </button>
              <button type="button" className={BOTON} onClick={accion(onBorrar)} aria-label={`Eliminar bloque «${nombre}»`}>
                <Icono nombre="papelera" tamano={16} />
              </button>
            </div>
          </>
        )
      )}
      {children}
    </div>
  )
}
