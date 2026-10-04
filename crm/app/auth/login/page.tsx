'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NOMBRE_EMPRESA } from '@/components/layout/navegacion'
import ThemeToggle from '@/components/layout/ThemeToggle'
import Campo from '@/components/ui/Campo'
import Icono from '@/components/ui/Icono'

export default function LoginPage() {
  const router = useRouter()
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)
    const { error: err } = await createClient().auth.signInWithPassword({ email: correo.trim(), password })
    if (err) {
      console.error('[login]', err)
      setError(
        /invalid login credentials/i.test(err.message) ? 'Correo o contraseña incorrectos'
          : /email not confirmed/i.test(err.message) ? 'Este usuario no está confirmado. En Supabase, crea el usuario marcando "Auto Confirm User".'
          : err.message,
      )
      setCargando(false)
      return
    }
    router.replace('/')
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="animar-subir w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-texto text-fondo">
            <Icono nombre="animal" tamano={24} grosor={2} />
          </span>
          <h1 className="text-[22px] font-semibold tracking-tight">{NOMBRE_EMPRESA}</h1>
          <p className="mt-1 text-[13.5px] text-texto-3">CRM y recursos humanos de la clínica</p>
        </div>

        <form onSubmit={entrar} className="tarjeta space-y-4 p-6 shadow-[var(--sombra)]">
          <Campo etiqueta="Correo">
            <input className="input" type="email" required autoComplete="username" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.com" />
          </Campo>
          <Campo etiqueta="Contraseña">
            <input className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Campo>
          {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-700 dark:text-rose-300">{error}</p>}
          <button type="submit" disabled={cargando} className="btn-primario h-9 w-full">
            {cargando ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="mt-5 text-center text-[12.5px] text-texto-3">
          Los usuarios se crean en Supabase (Authentication → Users).
        </p>
      </div>
    </main>
  )
}
