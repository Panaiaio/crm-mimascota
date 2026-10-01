import { Fraunces, Inter } from 'next/font/google';
import './globals.css';
import { site } from '@/data/site';

// Fuente display (titulares) - Fraunces
const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700']
});

// Fuente body (texto) - Inter
const inter = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700']
});

export const metadata = {
  title: {
    template: `%s | ${site.name}`,
    default: site.name
  },
  description: site.tagline,
  metadataBase: new URL('http://localhost:3000'), // PLACEHOLDER: URL real del sitio
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    title: site.name,
    description: site.tagline,
    type: 'website',
    locale: 'es_ES',
    siteName: site.name,
    images: [
      {
        url: site.hero.image,
        alt: site.name
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: site.name,
    description: site.tagline,
    images: [site.hero.image]
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#8FA98B'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
