type Contenido = Record<string, unknown>

export function texto(c: Contenido, clave: string): string {
  const v = c[clave]
  return typeof v === 'string' ? v : ''
}

export function lista(c: Contenido, clave: string): Contenido[] {
  const v = c[clave]
  return Array.isArray(v) ? v.filter((x): x is Contenido => typeof x === 'object' && x !== null) : []
}

// True when no field holds visible text or an image path. Alt text alone is not content.
export function sinContenido(valor: unknown): boolean {
  if (typeof valor === 'string') return valor.trim() === ''
  if (Array.isArray(valor)) return valor.every(sinContenido)
  if (typeof valor === 'object' && valor !== null) {
    return Object.entries(valor).every(([k, v]) => k === 'alt' || sinContenido(v))
  }
  return true
}

// Keeps only http(s), mailto, tel, anchors and relative links; anything else (javascript:, data:) is dropped.
export function enlaceSeguro(url: string): string | undefined {
  const u = url.trim()
  if (u === '') return undefined
  const esquema = /^([a-z][a-z0-9+.-]*):/i.exec(u)?.[1].toLowerCase()
  return esquema === undefined || ['http', 'https', 'mailto', 'tel'].includes(esquema) ? u : undefined
}
