'use client'

import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import type { Bloque, Web } from '@/lib/web/tipos'
import { paletaAVariables } from '@/lib/web/paletas'
import { PLANTILLAS } from '@/lib/web/plantillas'
import { SITIO_CSS_VISTA } from '@/lib/web/sitio.css'
import { soloImagenesDisponibles } from '@/lib/web/exportar'
import { cn } from '@/lib/utils'
import { Sitio } from '@/components/web/Sitio'

/** Links in the preview must not navigate away from the editor */
function sinNavegar(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('a')) e.preventDefault()
}

/**
 * Live preview of the site with its own palette and font. The palette goes on
 * the frame as CSS variables (never on :root, the CRM uses the same names).
 */
export default function Vista({ web, bloques, urls, movil, envolver, alFinal }: {
  web: Web
  bloques: Bloque[]
  urls: Map<string, string>
  movil: boolean
  envolver: (bloque: Bloque, nodo: ReactNode) => ReactNode
  alFinal: ReactNode
}) {
  // Images whose signed URL has not arrived yet are left out instead of rendering a broken <img>
  const visible = soloImagenesDisponibles(web, bloques, (ruta) => urls.has(ruta))
  const variables = { ...paletaAVariables(web.paleta), '--fuente': PLANTILLAS[web.plantilla].fuente } as CSSProperties

  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-superficie-2 p-4 sm:p-6" onClickCapture={sinNavegar}>
      <style>{SITIO_CSS_VISTA}</style>
      <div
        className={cn('vista-web mx-auto overflow-hidden rounded-xl border border-borde shadow-[var(--sombra)]', movil && 'max-w-[390px]')}
        style={variables}
      >
        <Sitio
          web={visible.web}
          bloques={visible.bloques}
          imagen={(ruta) => urls.get(ruta) ?? ''}
          envolver={envolver}
          conVacios
          alFinal={alFinal}
        />
      </div>
    </div>
  )
}
