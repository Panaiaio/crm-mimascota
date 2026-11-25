import { useId } from 'react'
import { motivoBloqueo, type RolColaborador } from '@/lib/web/seleccionColaboradores'

/** Editor/Lector select; the blocked option stays visible and the reason is written next to it */
export default function SelectorRol({
  etiqueta,
  valor,
  onChange,
  otros,
  nuevo,
}: {
  /** Accessible name, e.g. "Permiso de Ana" */
  etiqueta: string
  valor: RolColaborador
  onChange: (rol: RolColaborador) => void
  /** Everyone else once the pending changes apply (see `otrosDe`) */
  otros: { rol: RolColaborador }[]
  /** Not in the site yet (the people limit applies too) */
  nuevo: boolean
}) {
  const id = useId()
  const sinEditor = valor !== 'editor' ? motivoBloqueo(otros, 'editor', nuevo) : null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input w-32"
        aria-label={etiqueta}
        aria-describedby={sinEditor ? id : undefined}
        value={valor}
        onChange={(e) => onChange(e.target.value as RolColaborador)}
      >
        <option value="editor" disabled={!!sinEditor}>Editor</option>
        <option value="lector">Lector</option>
      </select>
      {sinEditor && <span id={id} className="text-[13px] text-texto-3">{sinEditor}</span>}
    </div>
  )
}
