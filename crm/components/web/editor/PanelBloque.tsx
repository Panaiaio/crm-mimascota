'use client'

import type { Bloque } from '@/lib/web/tipos'
import { BLOQUES } from '@/components/web/bloques'
import { CamposBloque } from './CampoBloqueControl'
import type { ContextoCampos } from './ImagenControl'

type Contenido = Record<string, unknown>

/** Fields of the selected block, built from its type's `campos` */
export default function PanelBloque({ bloque, onCambiar, ctx }: {
  bloque: Bloque
  onCambiar: (actualizar: (c: Contenido) => Contenido) => void
  ctx: ContextoCampos
}) {
  const def = BLOQUES[bloque.tipo]
  return (
    <div className="px-6 py-6">
      <p className="mb-6 text-[13px] text-texto-3">{def.descripcion}</p>
      <CamposBloque campos={def.campos} contenido={bloque.contenido} onCambiar={onCambiar} ctx={ctx} />
    </div>
  )
}
