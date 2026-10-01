import { cn, hashTexto, iniciales } from '@/lib/utils'

const FONDOS = [
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-pink-500/15 text-pink-700 dark:text-pink-300',
  'bg-teal-500/15 text-teal-700 dark:text-teal-300',
]

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
      className={cn(TAMANOS[tamano], forma, 'inline-flex shrink-0 items-center justify-center font-semibold', FONDOS[hashTexto(nombre, FONDOS.length)], className)}
    >
      {iniciales(nombre)}
    </span>
  )
}
