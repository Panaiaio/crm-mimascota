'use client'

import Link from 'next/link'
import { useSesion } from '@/hooks/useSesion'
import type { TituloPagina } from '@/hooks/useTituloPagina'
import { nombreCompleto } from '@/lib/utils'
import Icono from '@/components/ui/Icono'
import Avatar from '@/components/ui/Avatar'
import Menu from '@/components/ui/Menu'
import Notificaciones from './Notificaciones'

/** Cabecera de todas las páginas: título, búsqueda, notificaciones y usuario */
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

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6">
      <button type="button" onClick={onAbrirMenu} className="btn-icono lg:hidden" aria-label="Abrir menú">
        <Icono nombre="menu" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {titulo.volver && (
          <>
            <Link href={titulo.volver.href} className="hidden shrink-0 items-center gap-1 text-[15px] text-texto-3 hover:text-texto sm:flex">
              {titulo.volver.texto}
            </Link>
            <Icono nombre="derecha" tamano={14} className="hidden shrink-0 text-texto-3 sm:block" />
            <Link href={titulo.volver.href} className="btn-icono size-7 sm:hidden" aria-label={`Volver a ${titulo.volver.texto}`}>
              <Icono nombre="izquierda" tamano={15} />
            </Link>
          </>
        )}
        <h1 className="truncate text-[17px] font-semibold tracking-tight text-texto">{titulo.titulo}</h1>
        {titulo.insignia && <span className="hidden shrink-0 sm:inline-flex">{titulo.insignia}</span>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onBuscar} className="btn-icono rounded-full" aria-label="Buscar" title="Buscar (Ctrl + K)">
          <Icono nombre="buscar" />
        </button>
        <Notificaciones />
        <Menu
          etiqueta="Mi cuenta"
          boton={
            <span className="flex h-9 items-center gap-2 rounded-full border border-borde bg-superficie py-1 pr-3 pl-1 hover:bg-hover">
              <Avatar nombre={nombre} foto={empleado?.foto} tamano="sm" />
              <span className="hidden max-w-[140px] truncate text-[13px] font-medium sm:block">{nombre}</span>
            </span>
          }
          opciones={[
            { texto: 'Mi ficha', icono: 'particular', href: empleado ? `/rrhh/empleados/${empleado.id_empleado}` : undefined, oculto: !empleado },
            { texto: 'Mis fichajes', icono: 'reloj', href: '/rrhh/fichajes', oculto: !empleado },
            { texto: 'Cerrar sesión', icono: 'salir', onClick: onCerrarSesion, peligro: true },
          ]}
        />
      </div>
    </header>
  )
}
