import type { ReactNode } from 'react'
import Avatar from './Avatar'

/** Cabecera de una ficha (empresa, particular, animal, empleado): foto, nombre, etiquetas y botones */
export default function CabeceraFicha({
  nombre,
  foto,
  cuadrado,
  etiquetas,
  subtitulo,
  acciones,
  children,
}: {
  nombre: string
  foto?: string | null
  cuadrado?: boolean
  etiquetas?: ReactNode
  subtitulo?: ReactNode
  acciones?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="tarjeta p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar nombre={nombre} foto={foto} cuadrado={cuadrado} tamano="xl" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[22px] font-semibold tracking-tight">{nombre}</h2>
              {etiquetas}
            </div>
            {subtitulo && <div className="mt-1 text-[13.5px] text-texto-2">{subtitulo}</div>}
          </div>
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {children && <div className="mt-5 border-t border-borde pt-4">{children}</div>}
    </div>
  )
}

/** Cifras pequeñas en la parte de abajo de la cabecera */
export function CifrasFicha({ cifras }: { cifras: { etiqueta: string; valor: ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cifras.map((c) => (
        <div key={c.etiqueta}>
          <p className="text-[12.5px] text-texto-3">{c.etiqueta}</p>
          <div className="mt-1 text-[17px] font-semibold tabular-nums">{c.valor}</div>
        </div>
      ))}
    </div>
  )
}
