'use client'

import { useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import Icono from './Icono'

/** Zona para subir un archivo: se puede hacer clic o arrastrarlo encima */
export default function SubirArchivo({
  accept,
  onArchivo,
  texto = 'Subir archivo',
  ayuda,
  archivo,
  maxMB = 5,
  children,
}: {
  accept: string
  onArchivo: (archivo: File | null, error?: string) => void
  texto?: string
  ayuda?: string
  archivo?: File | null
  maxMB?: number
  children?: ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  const [encima, setEncima] = useState(false)

  function elegir(f: File | undefined) {
    if (!f) return
    if (f.size > maxMB * 1024 * 1024) return onArchivo(null, `El archivo pesa más de ${maxMB} MB`)
    const tipos = accept.split(',').map((t) => t.trim())
    const valido = tipos.some((t) => (t.endsWith('/*') ? f.type.startsWith(t.slice(0, -1)) : f.type === t || f.name.toLowerCase().endsWith(t)))
    if (!valido) return onArchivo(null, 'Ese tipo de archivo no está permitido')
    onArchivo(f)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setEncima(true) }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => { e.preventDefault(); setEncima(false); elegir(e.dataTransfer.files[0]) }}
      className={cn('flex items-center gap-4 rounded-xl border border-dashed p-3 transition-colors', encima ? 'border-primario bg-hover' : 'border-borde')}
    >
      {children}
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => input.current?.click()} className="btn-secundario">
          <Icono nombre="subir" tamano={14} /> {texto}
        </button>
        <p className="mt-1.5 truncate text-[12px] text-texto-3">{archivo ? archivo.name : ayuda}</p>
      </div>
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}
