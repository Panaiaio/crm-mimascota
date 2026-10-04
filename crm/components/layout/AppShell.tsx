'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createClient, supabaseConfigurado } from '@/lib/supabase/client'
import { SesionProvider, type Sesion } from '@/hooks/useSesion'
import { AvisosProvider } from '@/hooks/useAviso'
import { TituloProvider, type TituloPagina } from '@/hooks/useTituloPagina'
import type { Empleado } from '@/types'
import Icono from '@/components/ui/Icono'
import Sidebar from './Sidebar'
import Header from './Header'
import BuscadorRapido from './BuscadorRapido'
import { tituloPorRuta, type Contadores } from './navegacion'

/**
 * Estructura común de todas las páginas: comprueba la sesión, carga la ficha del
 * empleado que ha entrado y pinta el Sidebar y la cabecera alrededor de la página.
 * Las páginas de /auth (login) se pintan solas.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const ruta = usePathname()
  const router = useRouter()
  const esAuth = ruta.startsWith('/auth')

  const [sesion, setSesion] = useState<Omit<Sesion, 'recargar'> | null>(null)
  const [comprobando, setComprobando] = useState(true)
  const [version, setVersion] = useState(0)
  const [titulo, setTitulo] = useState<TituloPagina | null>(null)
  const [contadores, setContadores] = useState<Partial<Contadores>>({})
  const [menuMovil, setMenuMovil] = useState(false)
  const [buscador, setBuscador] = useState(false)

  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  // Sesión y ficha de empleado
  useEffect(() => {
    if (esAuth || !supabaseConfigurado) { setComprobando(false); return }
    let vivo = true
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!vivo) return
      const correo = data.user?.email
      if (!correo) { router.replace('/auth/login'); return }
      const { data: emp } = await sb.from('empleado').select('*').eq('correo', correo.toLowerCase()).eq('activo', true).maybeSingle()
      if (!vivo) return
      const empleado = (emp as Empleado | null) ?? null
      setSesion({ correo, empleado, esAdmin: empleado?.rol === 'admin' })
      setComprobando(false)
    })
    const { data: escucha } = sb.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') router.replace('/auth/login')
    })
    return () => { vivo = false; escucha.subscription.unsubscribe() }
  }, [esAuth, version, router])

  // Números del sidebar (se actualizan al cambiar de página)
  useEffect(() => {
    if (!sesion || !supabaseConfigurado) return
    const sb = createClient()
    const contar = async (consulta: PromiseLike<{ count: number | null }>) => (await consulta).count ?? 0
    const id = sesion.empleado?.id_empleado ?? '00000000-0000-0000-0000-000000000000'
    Promise.all([
      contar(sb.from('oportunidad').select('*', { count: 'exact', head: true }).in('estado', ['nuevo', 'contactado', 'presupuesto', 'cita'])),
      contar(sb.from('empresa').select('*', { count: 'exact', head: true })),
      contar(sb.from('particular').select('*', { count: 'exact', head: true })),
      contar(sb.from('animal').select('*', { count: 'exact', head: true })),
      contar(sb.from('empleado').select('*', { count: 'exact', head: true }).eq('activo', true)),
      sesion.esAdmin ? contar(sb.from('vacacion').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente')) : Promise.resolve(0),
      contar(sb.from('nomina').select('*', { count: 'exact', head: true }).eq('id_empleado_fk', id).eq('firmada', false)),
    ]).then(([oportunidades, empresas, particulares, animales, empleados, vacacionesPendientes, nominasSinFirmar]) =>
      setContadores({ oportunidades, empresas, particulares, animales, empleados, vacacionesPendientes, nominasSinFirmar }),
    ).catch(() => {})
  }, [sesion, ruta])

  // Ctrl + K abre la búsqueda
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuscador((b) => !b)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  async function cerrarSesion() {
    await createClient().auth.signOut()
    setSesion(null)
    router.replace('/auth/login')
  }

  if (!supabaseConfigurado) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="tarjeta max-w-lg p-6 text-[14px] leading-relaxed">
          <h1 className="mb-2 text-[17px] font-semibold">Falta conectar con Supabase</h1>
          <p className="text-texto-2">
            No se encuentran <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-texto-2">
            <li>En local: crea el archivo <code>crm/.env.local</code> (copia <code>.env.example</code>), pon los valores de Supabase → Project Settings → API y vuelve a arrancar con <code>npm run dev</code>.</li>
            <li>En Vercel: añádelas en Settings → Environment Variables y haz Redeploy.</li>
          </ul>
        </div>
      </div>
    )
  }

  if (esAuth) return <AvisosProvider>{children}</AvisosProvider>

  if (comprobando || !sesion) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <span className="inline-flex size-10 animate-pulse items-center justify-center rounded-xl bg-texto text-fondo">
          <Icono nombre="animal" tamano={20} grosor={2} />
        </span>
      </div>
    )
  }

  return (
    <SesionProvider value={{ ...sesion, recargar }}>
      <AvisosProvider>
        <TituloProvider value={setTitulo}>
          <div className="flex h-dvh overflow-hidden">
            <Sidebar contadores={contadores} abiertoMovil={menuMovil} onCerrarMovil={() => setMenuMovil(false)} />
            <section className="flex min-w-0 flex-1 flex-col">
              <Header
                titulo={titulo ?? { titulo: tituloPorRuta(ruta) }}
                onAbrirMenu={() => setMenuMovil(true)}
                onBuscar={() => setBuscador(true)}
                onCerrarSesion={cerrarSesion}
              />
              {!sesion.empleado && (
                <div className="mx-4 mb-2 rounded-lg border border-amber-500/35 bg-amber-400/10 px-4 py-2.5 text-[13px] text-amber-800 sm:mx-6 dark:text-amber-300">
                  Tu correo ({sesion.correo}) no está en ninguna ficha de empleado. Puedes usar el CRM, pero para fichar, pedir vacaciones o ver tus nóminas un administrador tiene que crear tu ficha con ese correo.
                </div>
              )}
              <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
            </section>
          </div>
          <BuscadorRapido abierto={buscador} onCerrar={() => setBuscador(false)} />
        </TituloProvider>
      </AvisosProvider>
    </SesionProvider>
  )
}
