type Contenido = Record<string, unknown>

export function comoTexto(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

export function comoLista(v: unknown): Contenido[] {
  return Array.isArray(v) ? v.filter((x): x is Contenido => typeof x === 'object' && x !== null) : []
}

export const texto = (c: Contenido, clave: string): string => comoTexto(c[clave])

export const lista = (c: Contenido, clave: string): Contenido[] => comoLista(c[clave])

// True when no field holds visible text or an image path. Alt text alone is not content.
export function sinContenido(valor: unknown): boolean {
  if (typeof valor === 'string') return valor.trim() === ''
  if (Array.isArray(valor)) return valor.every(sinContenido)
  if (typeof valor === 'object' && valor !== null) {
    return Object.entries(valor).every(([k, v]) => k === 'alt' || sinContenido(v))
  }
  return true
}

// Returns the cleaned link, keeping only http(s), mailto, tel, anchors and relative links; anything else (javascript:, data:) is dropped.
export function enlaceSeguro(url: string): string | undefined {
  // Browsers ignore tabs/newlines anywhere in a URL and leading control chars, so strip them all first.
  const u = [...url].filter((ch) => ch.charCodeAt(0) > 32).join('')
  if (u === '') return undefined
  const esquema = /^([a-z][a-z0-9+.-]*):/i.exec(u)?.[1].toLowerCase()
  return esquema === undefined || ['http', 'https', 'mailto', 'tel'].includes(esquema) ? u : undefined
}
