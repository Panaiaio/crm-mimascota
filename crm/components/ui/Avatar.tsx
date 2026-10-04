import { cn, iniciales } from '@/lib/utils'

const FONDO = 'border border-borde bg-superficie-2 text-texto-2'

const TAMANOS = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-[12px]',
  lg: 'size-12 text-[15px]',
  xl: 'size-16 text-[20px]',
}

/** Foto redonda o, si no hay foto, las iniciales sobre un color fijo para cada nombre */
export default function Avatar({
  nombre,
  foto,
  tamano = 'sm',
  cuadrado,
  className,
}: {
  nombre: string
  foto?: string | null
  tamano?: keyof typeof TAMANOS
  cuadrado?: boolean
  className?: string
}) {
  const forma = cuadrado ? 'rounded-lg' : 'rounded-full'
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt={nombre} className={cn(TAMANOS[tamano], forma, 'shrink-0 object-cover', className)} />
  }
  return (
    <span
      title={nombre}
      className={cn(TAMANOS[tamano], forma, 'inline-flex shrink-0 items-center justify-center font-semibold', FONDO, className)}
    >
      {iniciales(nombre)}
    </span>
  )
}
