'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAVEGACION } from './navegacion'
import { useSesion } from '@/hooks/useSesion'
import type { TituloPagina } from '@/hooks/useTituloPagina'
import { nombreCompleto } from '@/lib/utils'
import Icono from '@/components/ui/Icono'
import Avatar from '@/components/ui/Avatar'
import Menu from '@/components/ui/Menu'
import Notificaciones from './Notificaciones'
import ThemeToggle from './ThemeToggle'

/** Cabecera de todas las páginas: título, búsqueda, modo claro/oscuro, notificaciones, usuario y cerrar sesión */
export default function Header({
  titulo,
  onAbrirMenu,
  onBuscar,
  onCerrarSesion,
}: {
  titulo: TituloPagina
  onAbrirMenu: () => void
  onBuscar: () => void
  onCerrarSesion: () => void
}) {
  const { empleado, correo } = useSesion()
  const nombre = empleado ? nombreCompleto(empleado) : correo
  const ruta = usePathname()
  // Módulo (CRM / Recursos humanos) de la página actual, para las migas de pan
  const grupo = NAVEGACION.find((g) => g.grupo && g.enlaces.some((e) => ruta === e.href || ruta.startsWith(e.href + '/')))?.grupo

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 px-4 sm:px-6">
      <button type="button" onClick={onAbrirMenu} className="btn-icono lg:hidden" aria-label="Abrir menú">
        <Icono nombre="menu" />
      </button>

      <nav aria-label="Migas de pan" className="flex min-w-0 flex-1 items-center gap-2">
        {titulo.volver && (
          <Link href={titulo.volver.href} className="btn-icono sm:hidden" aria-label={`Volver a ${titulo.volver.texto}`}>
            <Icono nombre="izquierda" tamano={15} />
          </Link>
        )}
        <ol className="flex min-w-0 items-center gap-2">
          {grupo && (
            <li className="hidden shrink-0 items-center gap-2 text-[15px] text-texto-3 md:flex">
              {grupo} <Icono nombre="derecha" tamano={14} />
            </li>
          )}
          {titulo.volver && (
            <li className="hidden shrink-0 items-center gap-2 sm:flex">
              <Link href={titulo.volver.href} className="text-[15px] text-texto-2 underline-offset-4 hover:text-texto hover:underline">{titulo.volver.texto}</Link>
              <Icono nombre="derecha" tamano={14} className="text-texto-3" />
            </li>
          )}
          <li className="min-w-0"><h1 aria-current="page" className="truncate text-[17px] font-semibold tracking-tight text-texto">{titulo.titulo}</h1></li>
        </ol>
        {titulo.insignia && <span className="hidden shrink-0 sm:inline-flex">{titulo.insignia}</span>}
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onBuscar} className="btn-icono rounded-full" aria-label="Buscar" title="Buscar (Ctrl + K)">
          <Icono nombre="buscar" />
        </button>
        <ThemeToggle />
        <Notificaciones />
        <Menu
          etiqueta="Mi cuenta"
          boton={
            <span className="flex h-11 items-center gap-2 rounded-full border border-borde bg-superficie pr-4 pl-2 hover:bg-hover">
              <Avatar nombre={nombre} foto={empleado?.foto} tamano="sm" />
              <span className="hidden max-w-[140px] truncate text-[13px] font-medium sm:block">{nombre}</span>
            </span>
          }
          opciones={[
            { texto: 'Mi ficha', icono: 'particular', href: empleado ? `/rrhh/empleados/${empleado.id_empleado}` : undefined, oculto: !empleado },
            { texto: 'Mis fichajes', icono: 'reloj', href: '/rrhh/fichajes', oculto: !empleado },
          ]}
        />
        <button type="button" onClick={onCerrarSesion} className="btn-icono rounded-full" aria-label="Cerrar sesión" title="Cerrar sesión">
          <Icono nombre="salir" />
        </button>
      </div>
    </header>
  )
}
