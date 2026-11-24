'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearWeb } from '@/lib/web/datos'
import { PLANTILLAS } from '@/lib/web/plantillas'
import { PALETAS } from '@/lib/web/paletas'
import { MAX_NOMBRE } from '@/lib/web/limites'
import type { PlantillaId } from '@/lib/web/tipos'
import { errorLegible } from '@/lib/utils'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import Pasos from '@/components/ui/Pasos'
import Campo, { ErrorForm } from '@/components/ui/Campo'
import SelectorPaleta, { MiniPreview } from '@/components/web/SelectorPaleta'

const ORDEN: PlantillaId[] = ['negocio', 'portfolio', 'evento', 'vacia']
const paletaDe = (id: PlantillaId) => PALETAS.find((p) => p.id === PLANTILLAS[id].paleta)!.paleta

export default function NuevaWebPage() {
  const router = useRouter()
  const [paso, setPaso] = useState(0)
  const [plantilla, setPlantilla] = useState<PlantillaId>('negocio')
  const [paleta, setPaleta] = useState(paletaDe('negocio'))
  const [nombre, setNombre] = useState('')
  const [errorNombre, setErrorNombre] = useState<string | null>(null)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  useTituloPagina({ titulo: 'Nueva web', volver: { texto: 'Mis webs', href: '/web' } })

  function elegir(id: PlantillaId) {
    setPlantilla(id)
    setPaleta(paletaDe(id))
  }

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) return setErrorNombre('Escribe un nombre para la web, por ejemplo "Clínica del barrio".')
    if (limpio.length > MAX_NOMBRE) return setErrorNombre(`El nombre es demasiado largo. Acórtalo a ${MAX_NOMBRE} caracteres o menos.`)
    setErrorNombre(null)
    setErrorGeneral(null)
    setCreando(true)
    try {
      router.push(`/web/${await crearWeb(limpio, plantilla, paleta)}`)
    } catch (e) {
      setErrorGeneral(errorLegible(e))
      setCreando(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-x-hidden overflow-y-auto">
      <Pasos pasos={['Plantilla', 'Colores']} actual={paso} hechos={[paso > 0, false]} onIr={(i) => i < paso && setPaso(i)} />
      <div className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">
        {paso === 0 ? (
          <fieldset>
            <legend className="label">Elige una plantilla</legend>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(224px,1fr))] gap-4">
              {ORDEN.map((id) => (
                <label key={id} className="flex min-h-11 cursor-pointer flex-col gap-2 rounded-xl border border-borde-control bg-superficie p-4 hover:bg-hover has-checked:border-texto has-checked:ring-2 has-checked:ring-texto has-focus-visible:ring-3 has-focus-visible:ring-[var(--anillo)]">
                  <input type="radio" name="plantilla" className="sr-only" checked={plantilla === id} onChange={() => elegir(id)} />
                  <MiniPreview paleta={paletaDe(id)} />
                  <span className="font-medium text-texto">{PLANTILLAS[id].nombre}</span>
                  <span className="text-[13px] text-texto-3">{PLANTILLAS[id].descripcion}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div className="space-y-6">
            <Campo etiqueta="Nombre de la web" obligatorio error={errorNombre} ayuda={`Hasta ${MAX_NOMBRE} caracteres. Podrás cambiarlo después.`}>
              <input className="input" value={nombre} maxLength={MAX_NOMBRE} autoFocus onChange={(e) => { setNombre(e.target.value); setErrorNombre(null) }} />
            </Campo>
            <SelectorPaleta valor={paleta} onCambiar={setPaleta} />
          </div>
        )}
      </div>
      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-end gap-2 border-t border-borde p-4 sm:px-6">
        <ErrorForm mensaje={errorGeneral} />
        {paso === 0 ? (
          <>
            <button type="button" className="btn-secundario" onClick={() => router.push('/web')}>Cancelar</button>
            <button type="button" className="btn-primario" onClick={() => setPaso(1)}>Siguiente</button>
          </>
        ) : (
          <>
            <button type="button" className="btn-secundario" disabled={creando} onClick={() => setPaso(0)}>Atrás</button>
            <button type="button" className="btn-primario" disabled={creando} onClick={crear}>{creando ? 'Creando…' : 'Crear web'}</button>
          </>
        )}
      </div>
    </div>
  )
}
