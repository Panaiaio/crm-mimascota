import { CONTRASTE_GRAFICO, CONTRASTE_TEXTO, contraste, luminancia } from './contraste'

export type Paleta = {
  fondo: string
  superficie: string
  texto: string
  texto_suave: string
  primario: string
  sobre_primario: string
}

export const PALETAS: { id: string; nombre: string; paleta: Paleta }[] = [
  {
    id: 'claro',
    nombre: 'Claro neutro',
    paleta: { fondo: '#ffffff', superficie: '#f4f4f5', texto: '#18181b', texto_suave: '#52525b', primario: '#18181b', sobre_primario: '#ffffff' },
  },
  {
    id: 'oscuro',
    nombre: 'Oscuro',
    paleta: { fondo: '#111113', superficie: '#1c1c1f', texto: '#f4f4f5', texto_suave: '#a1a1aa', primario: '#f4f4f5', sobre_primario: '#111113' },
  },
  {
    id: 'mar',
    nombre: 'Mar',
    paleta: { fondo: '#f7fbfd', superficie: '#e3f0f6', texto: '#0c2a38', texto_suave: '#3f5f6e', primario: '#0b6a8f', sobre_primario: '#ffffff' },
  },
  {
    id: 'bosque',
    nombre: 'Bosque',
    paleta: { fondo: '#f8faf6', superficie: '#e8efe3', texto: '#14281a', texto_suave: '#455c4a', primario: '#2f6b3b', sobre_primario: '#ffffff' },
  },
  {
    id: 'terracota',
    nombre: 'Terracota',
    paleta: { fondo: '#fcf8f4', superficie: '#f4e8de', texto: '#2e1a12', texto_suave: '#6b4a3c', primario: '#a8431f', sobre_primario: '#ffffff' },
  },
  {
    id: 'lavanda',
    nombre: 'Lavanda',
    paleta: { fondo: '#faf8fd', superficie: '#eeeaf7', texto: '#231a3a', texto_suave: '#5a4f78', primario: '#6b4bb8', sobre_primario: '#ffffff' },
  },
]

type Aviso = { color: keyof Paleta; mensaje: string }

// Suggests the direction to move `color` to gain contrast against `contra`.
function direccion(contra: string): string {
  return luminancia(contra) > 0.18 ? 'más oscuro' : 'más claro'
}

export function avisosPaleta(p: Paleta): Aviso[] {
  const avisos: Aviso[] = []
  const revisar = (color: keyof Paleta, contra: keyof Paleta, minimo: number, que: string) => {
    const ratio = contraste(p[color], p[contra])
    if (ratio >= minimo) return
    avisos.push({
      color,
      mensaje: `${que} tiene poco contraste (${ratio.toFixed(1).replace('.', ',')}:1, mínimo ${String(minimo).replace('.', ',')}:1). Elige un color ${direccion(p[contra])}.`,
    })
  }
  revisar('texto', 'fondo', CONTRASTE_TEXTO, 'El texto sobre el fondo')
  revisar('texto', 'superficie', CONTRASTE_TEXTO, 'El texto sobre las tarjetas')
  revisar('texto_suave', 'fondo', CONTRASTE_TEXTO, 'El texto suave sobre el fondo')
  revisar('sobre_primario', 'primario', CONTRASTE_TEXTO, 'El texto de los botones')
  revisar('primario', 'fondo', CONTRASTE_GRAFICO, 'El color principal sobre el fondo')
  return avisos
}

export function paletaACss(p: Paleta): string {
  const lineas = Object.entries(p).map(([k, v]) => `  --${k}: ${v};`)
  return `:root {\n${lineas.join('\n')}\n}`
}
