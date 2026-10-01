import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Etiqueta + control de formulario + ayuda */
export default function Campo({
  etiqueta,
  obligatorio,
  ayuda,
  children,
  className,
}: {
  etiqueta: string
  obligatorio?: boolean
  ayuda?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="label">
        {etiqueta}
        {obligatorio && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {ayuda && <span className="mt-1 block text-[12px] text-texto-3">{ayuda}</span>}
    </label>
  )
}

/** Error de un formulario */
export function ErrorForm({ mensaje }: { mensaje?: string | null }) {
  if (!mensaje) return null
  return <p className="mr-auto text-[13px] text-rose-600 dark:text-rose-400">{mensaje}</p>
}
