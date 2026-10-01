import type { ReactNode } from 'react'
import Icono, { type NombreIcono } from './Icono'

/** Mensaje cuando una lista está vacía */
export default function Vacio({
  icono = 'info',
  titulo,
  texto,
  children,
}: {
  icono?: NombreIcono
  titulo: string
  texto?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-3 inline-flex size-10 items-center justify-center rounded-xl border border-borde bg-superficie-2 text-texto-3">
        <Icono nombre={icono} tamano={18} />
      </span>
      <p className="font-medium text-texto">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-[13px] text-texto-3">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
