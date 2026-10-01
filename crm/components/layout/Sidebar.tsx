'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useSesion } from '@/hooks/useSesion'
import { cn, nombreCompleto } from '@/lib/utils'
import Icono from '@/components/ui/Icono'
import Avatar from '@/components/ui/Avatar'
import ThemeToggle from './ThemeToggle'
import { NAVEGACION, NOMBRE_EMPRESA, type Contadores } from './navegacion'

const ANCHO_MIN = 220
const ANCHO_MAX = 360

/**
 * Menú lateral. En escritorio está siempre visible y se puede ensanchar arrastrando el borde;
 * en móvil se abre como un cajón con el botón de la cabecera.
 */
export default function Sidebar({
  contadores,
  abiertoMovil,
  onCerrarMovil,
  onCerrarSesion,
}: {
  contadores: Partial<Contadores>
  abiertoMovil: boolean
  onCerrarMovil: () => void
  onCerrarSesion: () => void
}) {
  const ruta = usePathname()
  const { empleado, correo, esAdmin } = useSesion()
  const [ancho, setAncho] = useState(256)
  const arrastrando = useRef(false)

  useEffect(() => {
    try {
      const guardado = Number(localStorage.getItem('ancho-sidebar'))
      if (guardado >= ANCHO_MIN && guardado <= ANCHO_MAX) setAncho(guardado)
    } catch {}
  }, [])

  // Cerrar el cajón al cambiar de página en el móvil
  useEffect(() => { onCerrarMovil() }, [ruta]) // eslint-disable-line react-hooks/exhaustive-deps

  function empezarArrastre(e: React.PointerEvent) {
    arrastrando.current = true
    const inicioX = e.clientX
    const inicioAncho = ancho
    let ultimo = ancho
    const mover = (ev: PointerEvent) => {
      if (!arrastrando.current) return
      ultimo = Math.min(ANCHO_MAX, Math.max(ANCHO_MIN, inicioAncho + ev.clientX - inicioX))
      setAncho(ultimo)
    }
    const soltar = () => {
      arrastrando.current = false
      try { localStorage.setItem('ancho-sidebar', String(ultimo)) } catch {}
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  const activo = (href: string) => (href === '/' ? ruta === '/' : ruta === href || ruta.startsWith(href + '/'))
  const nombre = empleado ? nombreCompleto(empleado) : correo

  const contenido = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-texto text-fondo">
          <Icono nombre="animal" tamano={18} grosor={2} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-semibold text-texto">{NOMBRE_EMPRESA}</p>
          <p className="truncate text-[12px] text-texto-3">CRM · Clínica veterinaria</p>
        </div>
      </div>

      {/* Menú */}
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-2.5 pt-2 pb-4">
        {NAVEGACION.map((g, i) => {
          const enlaces = g.enlaces.filter((e) => !e.soloAdmin || esAdmin)
          if (!enlaces.length) return null
          return (
            <div key={i}>
              {g.grupo && <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-[0.08em] text-texto-3 uppercase">{g.grupo}</p>}
              <ul className="space-y-0.5">
                {enlaces.map((e) => {
                  const n = e.contador ? contadores[e.contador] : undefined
                  const aviso = (e.contador === 'vacacionesPendientes' || e.contador === 'nominasSinFirmar') && !!n
                  return (
                    <li key={e.href}>
                      <Link
                        href={e.href}
                        className={cn(
                          'flex h-8 items-center gap-2.5 rounded-lg border px-2.5 text-[13.5px] transition-colors',
                          activo(e.href)
                            ? 'border-borde bg-activo font-medium text-texto'
                            : 'border-transparent text-texto-2 hover:bg-hover hover:text-texto',
                        )}
                      >
                        <Icono nombre={e.icono} tamano={16} />
                        <span className="flex-1 truncate">{e.texto}</span>
                        {n ? (
                          <span
                            className={cn(
                              'min-w-5 rounded-md px-1.5 text-center text-[11.5px] tabular-nums',
                              aviso ? 'bg-amber-400 font-semibold text-black' : 'text-texto-3',
                            )}
                          >
                            {n}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Abajo: modo claro/oscuro y usuario */}
      <div className="shrink-0 space-y-1 border-t border-borde p-2.5">
        <ThemeToggle />
        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
          <Avatar nombre={nombre} foto={empleado?.foto} tamano="md" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium text-texto">{nombre}</p>
            <p className="truncate text-[12px] text-texto-3">{esAdmin ? 'Administrador' : empleado?.puesto ?? 'Sin ficha de empleado'}</p>
          </div>
          <button type="button" onClick={onCerrarSesion} title="Cerrar sesión" aria-label="Cerrar sesión" className="rounded-md p-1.5 text-texto-3 hover:bg-hover hover:text-texto">
            <Icono nombre="salir" tamano={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Escritorio */}
      <aside className="relative hidden shrink-0 border-r border-borde bg-lateral lg:block" style={{ width: ancho }}>
        {contenido}
        <div
          onPointerDown={empezarArrastre}
          title="Arrastra para cambiar el ancho"
          className="absolute top-0 -right-1 h-full w-2 cursor-col-resize transition-colors hover:bg-borde/60"
        />
      </aside>

      {/* Móvil */}
      {abiertoMovil && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animar-aparecer absolute inset-0 bg-black/50" onClick={onCerrarMovil} />
          <aside className="animar-deslizar absolute inset-y-0 left-0 w-[280px] border-r border-borde bg-lateral">{contenido}</aside>
        </div>
      )}
    </>
  )
}
