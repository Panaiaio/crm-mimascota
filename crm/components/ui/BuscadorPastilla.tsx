import Icono from './Icono'

/** Buscador con la misma forma que los filtros: "Buscar | nombre, teléfono…" (la etiqueta siempre visible) */
export default function BuscadorPastilla({ valor, onChange, ayuda }: { valor: string; onChange: (v: string) => void; ayuda: string }) {
  return (
    <label className="pastilla w-64 max-w-full items-stretch">
      <span className="flex shrink-0 items-center gap-2 border-r border-borde px-2 text-texto-3">
        <Icono nombre="buscar" tamano={14} /> Buscar
      </span>
      <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={ayuda} aria-label="Buscar"
        className="h-full min-w-0 flex-1 bg-transparent px-2 outline-none placeholder:text-texto-3" />
    </label>
  )
}
