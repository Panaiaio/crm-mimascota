'use client'

import { useTema } from '@/hooks/useTema'
import { cn } from '@/lib/utils'
import Icono from '@/components/ui/Icono'

/** Botón del sidebar para cambiar entre modo claro y oscuro */
export default function ThemeToggle() {
  const { tema, cambiar } = useTema()
  const oscuro = tema === 'dark'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={oscuro}
      onClick={() => cambiar()}
      className="flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] text-texto-2 transition-colors hover:bg-hover hover:text-texto"
    >
      <Icono nombre={oscuro ? 'luna' : 'sol'} tamano={16} />
      <span className="flex-1 text-left">{oscuro ? 'Modo oscuro' : 'Modo claro'}</span>
      <span className={cn('relative h-[18px] w-8 rounded-full transition-colors', oscuro ? 'bg-primario' : 'bg-segmento')}>
        <span className={cn('absolute top-[2px] size-[14px] rounded-full bg-white shadow transition-all', oscuro ? 'left-[16px]' : 'left-[2px]')} />
      </span>
    </button>
  )
}
