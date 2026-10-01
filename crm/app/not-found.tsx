import Link from 'next/link'

export default function NoEncontrado() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="text-[40px] font-semibold tracking-tight text-texto">404</p>
      <p className="text-texto-3">Esta página no existe o se ha borrado.</p>
      <Link href="/" className="btn-secundario mt-2">Volver al inicio</Link>
    </div>
  )
}
