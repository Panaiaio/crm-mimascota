'use client'

import type { TipoBloque } from '@/lib/web/tipos'
import { BLOQUES } from '@/components/web/bloques'
import Modal from '@/components/ui/Modal'

/** Block catalogue: one button per block type, with its name and what it is for */
export default function CatalogoBloques({ abierto, onCerrar, onElegir }: {
  abierto: boolean
  onCerrar: () => void
  onElegir: (tipo: TipoBloque) => void
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Añadir bloque" subtitulo="Elige qué tipo de bloque quieres añadir a la web." ancho="lg">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(208px,1fr))] gap-4 px-6 py-6">
        {Object.values(BLOQUES).map((def) => (
          <li key={def.tipo}>
            <button
              type="button"
              onClick={() => onElegir(def.tipo)}
              className="flex h-full min-h-11 w-full flex-col items-start gap-1 rounded-xl border border-borde-control bg-superficie p-4 text-left hover:bg-hover"
            >
              <span className="font-medium text-texto">{def.nombre}</span>
              <span className="text-[13px] text-texto-3">{def.descripcion}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
