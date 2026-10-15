import { Fredoka, Nunito } from 'next/font/google';
import { MotionProvider } from '@/components/ui/MotionProvider';
import { site } from '@/data/site';
import './globals.css';

const fredoka = Fredoka({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap'
});

const nunito = Nunito({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap'
});

const title = `${site.name} · ${site.tagline}`;

export const metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: title,
    template: `%s · ${site.name}`
  },
  description: site.description,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: '/',
    siteName: site.name,
    title,
    description: site.description,
    images: [{ url: site.hero.image, width: 860, height: 574, alt: site.hero.imageAlt }]
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: site.description,
    images: [site.hero.image]
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FCF9F2'
};

const dayCodes = {
  Monday: 'Mo',
  Tuesday: 'Tu',
  Wednesday: 'We',
  Thursday: 'Th',
  Friday: 'Fr',
  Saturday: 'Sa',
  Sunday: 'Su'
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VeterinaryCare',
  name: site.legalName,
  alternateName: site.name,
  description: site.description,
  url: site.url,
  logo: `${site.url}${site.logo}`,
  image: `${site.url}${site.hero.image}`,
  telephone: site.phone.replace(/\s/g, ''),
  email: site.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: site.address.street,
    postalCode: site.address.postalCode,
    addressLocality: site.address.city,
    addressRegion: site.address.region,
    addressCountry: site.address.country
  },
  openingHours: site.hours
    .filter((slot) => !slot.closed)
    .map((slot) => {
      const days = slot.days.map((day) => dayCodes[day]);
      const range = days.length > 1 ? `${days[0]}-${days[days.length - 1]}` : days[0];
      return `${range} ${slot.opens}-${slot.closes}`;
    }),
  openingHoursSpecification: site.hours
    .filter((slot) => !slot.closed)
    .map((slot) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: slot.days,
      opens: slot.opens,
      closes: slot.closes
    })),
  sameAs: site.social.map((profile) => profile.href).filter((href) => new URL(href).pathname.length > 1)
};

// Antes del primer pintado: si ya se vio la animación en esta sesión, se oculta la pantalla de entrada
const skipScript = "try{if(sessionStorage.getItem('mm-preloader')==='1')document.documentElement.setAttribute('data-preloader','skip')}catch(e){}";

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${fredoka.variable} ${nunito.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: skipScript }} />
        <noscript>
          <style>{'[role="status"][aria-label^="Cargando"]{display:none!important}'}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
