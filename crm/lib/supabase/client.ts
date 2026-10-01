import { createBrowserClient } from '@supabase/ssr'

/** false si faltan las variables de Supabase en .env.local (o en Vercel) */
export const supabaseConfigurado = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

/** Cliente de Supabase para el navegador (páginas y componentes con 'use client'). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
