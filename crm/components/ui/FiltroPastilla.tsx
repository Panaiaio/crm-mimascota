'use client'

import type { Opcion } from '@/types'
import Icono from './Icono'

/** Filtro en forma de pastilla: "Ordenar | Valor ▾" (un <select> nativo por debajo) */
export default function FiltroPastilla({
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  etiqueta: string
  valor: string
  opciones: Opcion[]
  onChange: (valor: string) => void
}) {
  const actual = opciones.find((o) => o.valor === valor)?.texto ?? opciones[0]?.texto
  return (
    <div className="pastilla">
      <span className="flex items-center border-r border-borde px-2.5 text-texto-3">{etiqueta}</span>
      <label className="relative flex items-center gap-1.5 px-2.5 text-texto hover:bg-hover">
        <span className="max-w-[150px] truncate">{actual}</span>
        <Icono nombre="abajo" tamano={14} className="text-texto-3" />
        <select
          aria-label={etiqueta}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>{o.texto}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
