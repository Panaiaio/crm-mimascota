'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Icono, { type NombreIcono } from './Icono'

export interface OpcionMenu {
  texto: string
  icono?: NombreIcono
  href?: string
  onClick?: () => void
  peligro?: boolean
  oculto?: boolean
}

/** Menú desplegable. Por defecto el botón es "⋯" como la columna "Action" de la plantilla. */
export default function Menu({
  opciones,
  boton,
  alinear = 'derecha',
  etiqueta = 'Acciones',
}: {
  opciones: OpcionMenu[]
  boton?: ReactNode
  alinear?: 'izquierda' | 'derecha'
  etiqueta?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAbierto(false)
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const visibles = opciones.filter((o) => !o.oculto)
  if (!visibles.length) return null

  return (
    <div ref={ref} className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={etiqueta}
        aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}
        className={boton ? '' : 'inline-flex size-7 items-center justify-center rounded-md text-texto-3 hover:bg-activo hover:text-texto'}
      >
        {boton ?? <Icono nombre="puntos" tamano={18} grosor={2.5} />}
      </button>
      {abierto && (
        <div
          className={cn(
            'animar-aparecer absolute top-full z-40 mt-1 min-w-[180px] rounded-xl border border-borde bg-superficie p-1 shadow-[var(--sombra)]',
            alinear === 'derecha' ? 'right-0' : 'left-0',
          )}
        >
          {visibles.map((o) => {
            const clases = cn(
              'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px]',
              o.peligro ? 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400' : 'text-texto-2 hover:bg-hover hover:text-texto',
            )
            const contenido = (
              <>
                {o.icono && <Icono nombre={o.icono} tamano={15} />}
                {o.texto}
              </>
            )
            return o.href ? (
              <Link key={o.texto} href={o.href} className={clases} onClick={() => setAbierto(false)}>{contenido}</Link>
            ) : (
              <button key={o.texto} type="button" className={clases} onClick={() => { setAbierto(false); o.onClick?.() }}>{contenido}</button>
            )
          })}
        </div>
      )}
    </div>
  )
}
