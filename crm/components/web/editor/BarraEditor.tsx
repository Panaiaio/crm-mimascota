'use client'

import type { ReactNode } from 'react'
import type { EstadoGuardado } from '@/lib/web/colaGuardado'
import Campo from '@/components/ui/Campo'
import Icono from '@/components/ui/Icono'
import { MAX_NOMBRE } from '@/lib/web/limites'

const ERROR_NOMBRE = 'Escribe un nombre para la web; mientras esté vacío se guarda el anterior.'

const ESTADOS: Record<EstadoGuardado, string> = {
  guardado: 'Guardado',
  guardando: 'Guardando…',
  error: 'No se ha podido guardar',
}

/** Top bar of the editor: site name, save status, avatars, collaborators and "Exportar" */
export default function BarraEditor({
  nombre,
  onNombre,
  soloLectura,
  bloqueadoPor,
  guardado,
  avatares,
  onVerColaboradores,
  onExportar,
  exportando,
}: {
  nombre: string
  onNombre: (nombre: string) => void
  soloLectura: boolean
  /** Someone else is editing the site settings, the name included (live collaboration) */
  bloqueadoPor: string | null
  guardado: EstadoGuardado
  /** Slot for who is in the site (live collaboration) */
  avatares?: ReactNode
  /** Opens the collaborators dialog */
  onVerColaboradores: () => void
  onExportar: () => void
  exportando: boolean
}) {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b border-borde px-4 py-2 sm:px-6">
      <Campo
        etiqueta="Nombre de la web"
        error={!soloLectura && !bloqueadoPor && !nombre.trim() ? ERROR_NOMBRE : null}
        ayuda={!soloLectura && bloqueadoPor ? `Lo está editando ${bloqueadoPor}.` : undefined}
        className="w-full min-w-0 sm:w-80"
      >
        <input className="input" value={nombre} maxLength={MAX_NOMBRE} readOnly={soloLectura || !!bloqueadoPor} onChange={(e) => onNombre(e.target.value)} />
      </Campo>
      <p role="status" className="flex min-h-11 items-center gap-2 text-[13px]">
        {soloLectura ? (
          <span className="text-texto-3">Solo lectura</span>
        ) : guardado === 'error' ? (
          <span className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <Icono nombre="alerta" tamano={15} /> {ESTADOS.error}
          </span>
        ) : (
          <span className="text-texto-3">{ESTADOS[guardado]}</span>
        )}
      </p>
      <div className="ml-auto flex items-center gap-2">
        {avatares}
        <button type="button" className="btn-secundario" onClick={onVerColaboradores} aria-label="Ver colaboradores">
          <Icono nombre="equipo" tamano={14} /> <span className="hidden sm:inline">Ver colaboradores</span>
        </button>
        <button type="button" className="btn-primario" onClick={onExportar} disabled={exportando}>
          <Icono nombre="descargar" tamano={14} /> {exportando ? 'Exportando…' : 'Exportar'}
        </button>
      </div>
    </div>
  )
}
