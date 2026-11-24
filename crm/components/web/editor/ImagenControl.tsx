'use client'

/* eslint-disable @next/next/no-img-element -- thumbnails come from signed Supabase URLs, not from next/image */
import { useState } from 'react'
import { subirImagen } from '@/lib/web/datos'
import { errorLegible } from '@/lib/utils'
import SubirArchivo from '@/components/ui/SubirArchivo'
import Icono from '@/components/ui/Icono'

export type ContextoCampos = {
  idWeb: string
  /** Signed URLs already loaded, by storage path */
  urls: Map<string, string>
  soloLectura: boolean
}

/** Image field: upload to the site's folder, thumbnail and "Quitar imagen" */
export default function ImagenControl({
  etiqueta,
  ruta,
  onCambiar,
  ctx,
  obligatorio,
}: {
  etiqueta: string
  ruta: string
  onCambiar: (ruta: string) => void
  ctx: ContextoCampos
  obligatorio?: boolean
}) {
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const url = ruta ? ctx.urls.get(ruta) : undefined
  const miniatura = ruta ? (
    url ? <img src={url} alt="" className="size-16 shrink-0 rounded-lg border border-borde object-cover" /> : <span className="esqueleto size-16 shrink-0 rounded-lg" />
  ) : null

  async function subir(archivo: File | null, motivo?: string) {
    if (!archivo) return setError(motivo ? `${motivo}. Elige una imagen JPG, PNG o WebP de hasta 5 MB.` : null)
    setError(null)
    setSubiendo(true)
    try {
      onCambiar(await subirImagen(ctx.idWeb, archivo))
    } catch (e) {
      setError(errorLegible(e))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <fieldset>
      <legend className="label">
        {etiqueta}
        {obligatorio && <span className="ml-2 text-rose-700 dark:text-rose-400" aria-hidden="true">*</span>}
        {obligatorio && <span className="sr-only"> (obligatorio)</span>}
      </legend>
      {ctx.soloLectura ? (
        miniatura ?? <p className="text-[13px] text-texto-3">Sin imagen</p>
      ) : (
        <>
          <SubirArchivo
            accept="image/jpeg,image/png,image/webp"
            maxMB={5}
            onArchivo={subir}
            texto={subiendo ? 'Subiendo…' : ruta ? 'Cambiar imagen' : 'Subir imagen'}
            ayuda="JPG, PNG o WebP, hasta 5 MB"
          >
            {miniatura}
          </SubirArchivo>
          {ruta && (
            <button type="button" className="btn-fantasma mt-2" onClick={() => onCambiar('')}>
              <Icono nombre="papelera" tamano={14} /> Quitar imagen
            </button>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-2 text-[13px] text-rose-700 dark:text-rose-400">
          <Icono nombre="alerta" tamano={15} className="mt-px shrink-0" /> {error}
        </p>
      )}
    </fieldset>
  )
}
