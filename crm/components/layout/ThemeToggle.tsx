'use client'

import { useTema } from '@/hooks/useTema'
import Icono from '@/components/ui/Icono'

/** Botón (sol / luna) para cambiar entre modo claro y oscuro */
export default function ThemeToggle() {
  const { tema, cambiar } = useTema()
  const oscuro = tema === 'dark'
  return (
    <button
      type="button"
      onClick={() => cambiar()}
      className="btn-icono rounded-full"
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      <Icono nombre={oscuro ? 'sol' : 'luna'} />
    </button>
  )
}
