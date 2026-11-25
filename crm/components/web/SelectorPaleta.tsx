'use client'

import { PALETAS, avisosPaleta, type Paleta } from '@/lib/web/paletas'
import Icono from '@/components/ui/Icono'

const COLORES: { clave: keyof Paleta; etiqueta: string }[] = [
  { clave: 'fondo', etiqueta: 'Fondo' },
  { clave: 'superficie', etiqueta: 'Tarjetas' },
  { clave: 'texto', etiqueta: 'Texto' },
  { clave: 'texto_suave', etiqueta: 'Texto suave' },
  { clave: 'primario', etiqueta: 'Color principal' },
  { clave: 'sobre_primario', etiqueta: 'Texto de los botones' },
]

const mismaPaleta = (a: Paleta, b: Paleta) => COLORES.every(({ clave }) => a[clave].toLowerCase() === b[clave].toLowerCase())

/** Mini preview drawn with the site's own colours (inline, so nothing leaks into the CRM tokens) */
export function MiniPreview({ paleta }: { paleta: Paleta }) {
  return (
    <span aria-hidden="true" className="block rounded-md border border-borde p-2" style={{ background: paleta.fondo }}>
      <span className="block h-2 w-2/3 rounded-sm" style={{ background: paleta.texto }} />
      <span className="mt-1 block h-1 w-full rounded-sm" style={{ background: paleta.texto_suave }} />
      <span className="mt-2 flex gap-1">
        <span className="h-5 flex-1 rounded-sm" style={{ background: paleta.superficie }} />
        <span className="flex h-5 w-8 items-center justify-center rounded-sm" style={{ background: paleta.primario }}>
          <span className="h-1 w-4 rounded-sm" style={{ background: paleta.sobre_primario }} />
        </span>
      </span>
    </span>
  )
}

/** Six ready-made palettes (radio group) plus six custom colours with contrast warnings */
export default function SelectorPaleta({ valor, onCambiar }: { valor: Paleta; onCambiar: (p: Paleta) => void }) {
  const avisos = avisosPaleta(valor)
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="label">Paleta de colores</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(136px,1fr))] gap-2">
          {PALETAS.map((p) => (
            <label key={p.id} className="flex min-h-11 cursor-pointer flex-col gap-2 rounded-lg border border-borde-control bg-superficie p-2 hover:bg-hover has-checked:border-texto has-checked:ring-2 has-checked:ring-texto has-focus-visible:ring-3 has-focus-visible:ring-[var(--anillo)]">
              <input type="radio" name="paleta" className="sr-only" checked={mismaPaleta(valor, p.paleta)} onChange={() => onCambiar(p.paleta)} />
              <MiniPreview paleta={p.paleta} />
              <span className="text-[13px] font-medium text-texto">{p.nombre}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Personalizar</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(136px,1fr))] gap-4">
          {COLORES.map(({ clave, etiqueta }) => {
            const suyos = avisos.filter((a) => a.color === clave)
            return (
              <div key={clave}>
                <label className="block">
                  <span className="label">{etiqueta}</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="color"
                      value={valor[clave]}
                      onChange={(e) => onCambiar({ ...valor, [clave]: e.target.value })}
                      aria-invalid={suyos.length ? true : undefined}
                      className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-borde-control bg-superficie p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
                    />
                    <span className="text-[13px] text-texto-3 tabular-nums">{valor[clave]}</span>
                  </span>
                </label>
                {suyos.map((a) => (
                  <p key={a.mensaje} role="status" className="mt-2 flex items-start gap-2 text-[12.5px] text-amber-700 dark:text-amber-400">
                    <Icono nombre="alerta" tamano={15} className="mt-px shrink-0" /> {a.mensaje}
                  </p>
                ))}
              </div>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
