import type { ReactNode } from 'react'

/** Barra inferior de las tablas: "18 empresas en vista · Valor total · Probabilidad media" */
export default function PieTabla({ items }: { items: { etiqueta: string; valor?: ReactNode }[] }) {
  return (
    <div className="flex shrink-0 overflow-x-auto border-t border-borde bg-fondo text-[12.5px]">
      {items.map((it, i) => (
        <div key={i} className="flex h-10 shrink-0 items-center gap-2 border-r border-borde px-4 whitespace-nowrap last:border-r-0 sm:min-w-[200px]">
          {it.valor != null && <span className="font-medium text-texto tabular-nums">{it.valor}</span>}
          <span className="text-texto-3">{it.etiqueta}</span>
        </div>
      ))}
    </div>
  )
}
