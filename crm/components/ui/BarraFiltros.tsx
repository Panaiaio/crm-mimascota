'use client'

import { useState, type ReactNode } from 'react'
import Icono from './Icono'

/**
 * Fila de filtros (izquierda) y botones (derecha) encima de una tabla.
 * En el móvil los filtros se esconden tras un botón "Filtros" que abre un panel, como en la plantilla.
 */
export default function BarraFiltros({ filtros, acciones }: { filtros?: ReactNode; acciones?: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        {filtros && (
          <>
            <div className="hidden flex-wrap items-center gap-2 md:flex">{filtros}</div>
            <button type="button" className="btn-secundario md:hidden" onClick={() => setAbierto(true)}>
              <Icono nombre="lista" tamano={14} /> Filtros
            </button>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">{acciones}</div>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="animar-aparecer absolute inset-0 bg-black/50" onClick={() => setAbierto(false)} />
          <div className="animar-subir absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-borde bg-superficie p-4 pb-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[15px] font-semibold">Filtros</p>
              <button type="button" onClick={() => setAbierto(false)} className="rounded-md p-1.5 text-texto-3 hover:bg-hover" aria-label="Cerrar filtros">
                <Icono nombre="cerrar" />
              </button>
            </div>
            <div className="flex flex-col gap-2.5 [&>*]:w-full [&_.pastilla]:w-full [&_.pastilla>label]:flex-1 [&_.pastilla>label]:justify-between">{filtros}</div>
            <button type="button" className="btn-primario mt-5 h-10 w-full" onClick={() => setAbierto(false)}>Ver resultados</button>
          </div>
        </div>
      )}
    </>
  )
}
