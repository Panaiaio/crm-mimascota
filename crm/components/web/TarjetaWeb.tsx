import Link from 'next/link'
import { PLANTILLAS } from '@/lib/web/plantillas'
import type { WebConRol } from '@/lib/web/datos'
import type { RolWeb } from '@/lib/web/tipos'
import { formatDia } from '@/lib/utils'
import Icono from '@/components/ui/Icono'

const ROLES: Record<RolWeb, string> = { dueno: 'Dueño', editor: 'Editor', lector: 'Lector', admin: 'Admin' }

export default function TarjetaWeb({ web, miId }: { web: WebConRol; miId: string }) {
  const mia = web.id_dueno_fk === miId
  return (
    <Link href={`/web/${web.id_web}`} className="flex h-full min-h-11 flex-col gap-2 rounded-xl border border-borde bg-superficie p-4 transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario">
      <span className="flex items-start gap-2">
        <Icono nombre="web" tamano={18} className="mt-px shrink-0 text-texto-3" />
        <span className="min-w-0 break-words font-medium text-texto">{web.nombre}</span>
      </span>
      <span className="text-[13px] text-texto-2">{PLANTILLAS[web.plantilla].nombre}</span>
      <span className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-texto-3">
        <span>Borrador</span>
        <span>Modificada {formatDia(web.actualizada)}</span>
        <span>{ROLES[web.rol]}</span>
      </span>
      {!mia && web.dueno && <span className="mt-auto self-end pt-2 text-[12.5px] text-texto-3">{web.dueno}</span>}
    </Link>
  )
}
