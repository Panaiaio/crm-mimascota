import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import type { Presencia } from '@/lib/web/presencia'

const MAX_VISIBLES = 5

/**
 * Who is in the site, me first ("Tú"): initials with the full name as tooltip
 * and for screen readers. An admin is always labelled as such.
 */
export default function Avatares({ personas, yo }: { personas: Presencia[]; yo: string }) {
  if (!personas.length) return null
  const nombre = (p: Presencia) => (p.id_empleado === yo ? 'Tú' : p.nombre)
  const describir = (p: Presencia) => (p.esAdmin ? `${nombre(p)} (admin)` : nombre(p))
  const visibles = personas.slice(0, MAX_VISIBLES)
  const resto = personas.slice(MAX_VISIBLES)
  return (
    <ul aria-label="Personas en esta web" className="flex items-center gap-1">
      {visibles.map((p) => (
        <li key={p.id_empleado} title={describir(p)} className="flex items-center gap-1">
          <span aria-hidden><Avatar nombre={p.nombre} tamano="md" /></span>
          <span className="sr-only">{nombre(p)}</span>
          {p.esAdmin && <Etiqueta tono="morado" className="h-5 px-2 text-[11px]">Admin</Etiqueta>}
        </li>
      ))}
      {resto.length > 0 && (
        <li title={resto.map(describir).join(', ')} className="flex size-8 items-center justify-center rounded-full border border-borde bg-superficie-2 text-[12px] font-semibold text-texto-2">
          <span aria-hidden>+{resto.length}</span>
          <span className="sr-only">Y {resto.length} más: {resto.map(describir).join(', ')}</span>
        </li>
      )}
    </ul>
  )
}
