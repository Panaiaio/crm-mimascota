'use client'

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import Icono from '@/components/ui/Icono'

const FOCOS = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'

/**
 * Right column on lg and up. Below lg it is a sheet over the preview while
 * `abierto`, with dialog semantics: focus moves in and back, Tab stays inside
 * and Escape closes it.
 */
export default function PanelLateral({ titulo, abierto, cerrable, zonaAjustes, onCerrar, children }: {
  titulo: string
  abierto: boolean
  /** Shows the close button on lg and up too */
  cerrable: boolean
  /** Focus anywhere in the panel keeps the site settings held (see Editor) */
  zonaAjustes: boolean
  onCerrar: () => void
  children: ReactNode
}) {
  const ancho = useMediaQuery('(min-width: 64rem)')
  const hoja = !ancho && abierto
  const ref = useRef<HTMLElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    if (!hoja) return
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null
    // Typing elsewhere (e.g. the site name in the top bar) keeps its focus
    if (!(antes instanceof HTMLInputElement || antes instanceof HTMLTextAreaElement)) ref.current?.focus()
    return () => antes?.focus()
  }, [hoja])

  function teclas(e: KeyboardEvent) {
    if (!hoja) return
    if (e.key === 'Escape') {
      e.stopPropagation()
      onCerrar()
    } else if (e.key === 'Tab' && ref.current) {
      const focos = [...ref.current.querySelectorAll<HTMLElement>(FOCOS)].filter((el) => el.offsetParent !== null)
      const primero = focos[0]
      const ultimo = focos[focos.length - 1]
      if (!primero) return
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === ref.current)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
  }

  return (
    <aside
      ref={ref}
      tabIndex={-1}
      role={hoja ? 'dialog' : undefined}
      aria-modal={hoja || undefined}
      aria-labelledby={idTitulo}
      data-zona-ajustes={zonaAjustes || undefined}
      onKeyDown={teclas}
      className={cn(
        'flex-col border-borde bg-superficie focus:outline-none lg:static lg:z-auto lg:flex lg:max-h-none lg:w-[360px] lg:shrink-0 lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none',
        abierto ? 'fixed inset-x-0 bottom-0 z-40 flex max-h-[75dvh] rounded-t-2xl border-t shadow-[var(--sombra)]' : 'hidden',
      )}
    >
      <div className="flex items-center gap-2 border-b border-borde py-2 pr-2 pl-6">
        <h2 id={idTitulo} className="mr-auto truncate text-[15px] font-semibold text-texto">{titulo}</h2>
        <button
          type="button"
          className={cn('btn-icono border-0', !abierto && 'invisible', !cerrable && 'lg:invisible')}
          onClick={onCerrar}
          aria-label="Cerrar el panel"
        >
          <Icono nombre="cerrar" tamano={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</div>
    </aside>
  )
}
