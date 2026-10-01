import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import AppShell from '@/components/layout/AppShell'
import { SCRIPT_TEMA } from '@/hooks/useTema'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'CRM · ' + (process.env.NEXT_PUBLIC_NOMBRE_EMPRESA || 'Mi Mascota'), template: '%s · CRM' },
  description: 'CRM y recursos humanos de la clínica veterinaria',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Pone el modo claro/oscuro guardado antes de pintar, para que no parpadee */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
