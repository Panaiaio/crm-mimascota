'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useSesion } from '@/hooks/useSesion'
import { cn } from '@/lib/utils'
import Icono from '@/components/ui/Icono'
import { NAVEGACION, NOMBRE_EMPRESA, type Contadores, type EnlaceNav } from './navegacion'

const ANCHO_MIN = 220
const ANCHO_MAX = 360
const ANCHO_PLEGADO = 64

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const v = localStorage.getItem(clave)
    return v ? (JSON.parse(v) as T) : porDefecto
  } catch {
    return porDefecto
  }
}

function guardar(clave: string, valor: unknown) {
  try { localStorage.setItem(clave, JSON.stringify(valor)) } catch {}
}

/**
 * Menú lateral.
 * - En escritorio se pliega a solo iconos con el botón de arriba y se ensancha arrastrando el borde.
 * - Cada apartado (CRM, Recursos humanos) se despliega o se repliega con su flecha.
 * - En móvil se abre como un cajón con el botón de la cabecera.
 */
export default function Sidebar({
  contadores,
  abiertoMovil,
  onCerrarMovil,
}: {
  contadores: Partial<Contadores>
  abiertoMovil: boolean
  onCerrarMovil: () => void
}) {
  const ruta = usePathname()
  const { esAdmin } = useSesion()
  const [ancho, setAncho] = useState(256)
  const [plegado, setPlegado] = useState(false)
  const [cerrados, setCerrados] = useState<string[]>([])
  const arrastrando = useRef(false)

  useEffect(() => {
    const a = leer('ancho-sidebar', 256)
    if (a >= ANCHO_MIN && a <= ANCHO_MAX) setAncho(a)
    setPlegado(leer('sidebar-plegado', false))
    setCerrados(leer('sidebar-grupos-cerrados', []))
  }, [])

  // Cerrar el cajón al cambiar de página en el móvil
  useEffect(() => { onCerrarMovil() }, [ruta]) // eslint-disable-line react-hooks/exhaustive-deps

  function alternarPlegado() {
    setPlegado((p) => { guardar('sidebar-plegado', !p); return !p })
  }

  function alternarGrupo(grupo: string) {
    setCerrados((c) => {
      const n = c.includes(grupo) ? c.filter((g) => g !== grupo) : [...c, grupo]
      guardar('sidebar-grupos-cerrados', n)
      return n
    })
  }

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
      guardar('ancho-sidebar', ultimo)
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  const activo = (href: string) => (href === '/' ? ruta === '/' : ruta === href || ruta.startsWith(href + '/'))

  function enlace(e: EnlaceNav, soloIcono: boolean) {
    const n = e.contador ? contadores[e.contador] : undefined
    const aviso = (e.contador === 'vacacionesPendientes' || e.contador === 'nominasSinFirmar') && !!n
    return (
      <li key={e.href}>
        <Link
          href={e.href}
          title={soloIcono ? e.texto : undefined}
          className={cn(
            'relative flex h-8 items-center gap-2.5 rounded-lg border text-[13.5px] transition-colors',
            soloIcono ? 'justify-center px-0' : 'px-2.5',
            activo(e.href) ? 'border-borde bg-activo font-medium text-texto' : 'border-transparent text-texto-2 hover:bg-hover hover:text-texto',
          )}
        >
          <Icono nombre={e.icono} tamano={16} />
          {!soloIcono && <span className="flex-1 truncate">{e.texto}</span>}
          {!soloIcono && n ? (
            <span className={cn('min-w-5 rounded-md px-1.5 text-center text-[11.5px] tabular-nums', aviso ? 'bg-amber-400 font-semibold text-black' : 'text-texto-3')}>{n}</span>
          ) : null}
          {soloIcono && aviso && <span className="absolute top-1 right-2 size-2 rounded-full bg-amber-400" />}
        </Link>
      </li>
    )
  }

  const contenido = (soloIcono: boolean) => (
    <div className="flex h-full flex-col">
      {/* Logo y botón para plegar */}
      <div className={cn('flex h-16 shrink-0 items-center gap-3', soloIcono ? 'justify-center px-2' : 'px-4')}>
        {!soloIcono && (
          <>
            {/* Logo de la clínica (crm/public/logo.png, con el fondo transparente) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={32} height={32} className="size-8 shrink-0 object-contain" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[14px] font-semibold text-texto">{NOMBRE_EMPRESA}</p>
              <p className="truncate text-[12px] text-texto-3">CRM · Clínica veterinaria</p>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={abiertoMovil ? onCerrarMovil : alternarPlegado}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-texto-3 hover:bg-hover hover:text-texto"
          aria-label={abiertoMovil ? 'Cerrar menú' : soloIcono ? 'Desplegar menú' : 'Plegar menú'}
          title={soloIcono ? 'Desplegar menú' : 'Plegar menú'}
        >
          <Icono nombre={abiertoMovil ? 'cerrar' : 'panel'} tamano={17} />
        </button>
      </div>

      {/* Menú */}
      <nav className={cn('min-h-0 flex-1 overflow-y-auto pt-2 pb-4', soloIcono ? 'space-y-3 px-2' : 'space-y-4 px-2.5')}>
        {NAVEGACION.map((g, i) => {
          const enlaces = g.enlaces.filter((e) => !e.soloAdmin || esAdmin)
          if (!enlaces.length) return null
          const cerrado = !!g.grupo && cerrados.includes(g.grupo) && !soloIcono
          return (
            <div key={i} className={cn(soloIcono && i > 0 && 'border-t border-borde pt-3')}>
              {g.grupo && !soloIcono && (
                <button
                  type="button"
                  onClick={() => alternarGrupo(g.grupo!)}
                  aria-expanded={!cerrado}
                  className="mb-1 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] text-texto-3 uppercase hover:text-texto-2"
                >
                  <Icono nombre={cerrado ? 'derecha' : 'abajo'} tamano={13} grosor={2.25} />
                  {g.grupo}
                </button>
              )}
              {!cerrado && <ul className="space-y-0.5">{enlaces.map((e) => enlace(e, soloIcono))}</ul>}
            </div>
          )
        })}
      </nav>
    </div>
  )

  return (
    <>
      {/* Escritorio */}
      <aside
        className="relative hidden shrink-0 border-r border-borde bg-lateral transition-[width] duration-200 lg:block"
        style={{ width: plegado ? ANCHO_PLEGADO : ancho }}
      >
        {contenido(plegado)}
        {!plegado && (
          <div
            onPointerDown={empezarArrastre}
            title="Arrastra para cambiar el ancho"
            className="absolute top-0 -right-1 h-full w-2 cursor-col-resize transition-colors hover:bg-borde/60"
          />
        )}
      </aside>

      {/* Móvil */}
      {abiertoMovil && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="animar-aparecer absolute inset-0 bg-black/50" onClick={onCerrarMovil} />
          <aside className="animar-deslizar absolute inset-y-0 left-0 w-[280px] border-r border-borde bg-lateral">{contenido(false)}</aside>
        </div>
      )}
    </>
  )
}
