'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearWeb } from '@/lib/web/datos'
import { PLANTILLAS } from '@/lib/web/plantillas'
import { PALETAS } from '@/lib/web/paletas'
import { MAX_NOMBRE } from '@/lib/web/limites'
import type { PlantillaId } from '@/lib/web/tipos'
import { cn, errorLegible } from '@/lib/utils'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import Icono from '@/components/ui/Icono'
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
    setPaso(1)
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
      <Pasos pasos={['Plantilla', 'Colores']} actual={paso} hechos={[paso > 0, false]} onIr={(i) => !creando && i < paso && setPaso(i)}
        inicio={<button type="button" className="btn-icono" aria-label="Volver a Mis webs" onClick={() => router.push('/web')}><Icono nombre="izquierda" /></button>} />
      <div className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        {paso === 0 ? (
          <section aria-labelledby="titulo-plantillas">
            <h2 id="titulo-plantillas" className="label">Elige una plantilla</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ORDEN.map((id) => {
                const vacia = id === 'vacia'
                return (
                  <button key={id} type="button" aria-pressed={plantilla === id} onClick={() => elegir(id)}
                    className={cn('flex min-h-11 cursor-pointer flex-col gap-2 rounded-xl border bg-superficie p-4 text-left hover:bg-hover focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--anillo)]',
                      vacia ? 'border-dashed border-borde-control' : 'border-borde-control',
                      plantilla === id && 'border-texto ring-2 ring-texto')}>
                    {vacia ? (
                      <span aria-hidden="true" className="flex h-[62px] items-center justify-center rounded-md border border-dashed border-borde-control text-texto-3">
                        <Icono nombre="mas" tamano={28} />
                      </span>
                    ) : (
                      <MiniPreview paleta={paletaDe(id)} />
                    )}
                    <span className="font-medium text-texto">{PLANTILLAS[id].nombre}</span>
                    <span className="text-[13px] text-texto-3">{vacia ? 'Una página en blanco: añade tú los bloques que quieras.' : PLANTILLAS[id].descripcion}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : (
          <div className="space-y-6">
            <Campo etiqueta="Nombre de la web" obligatorio error={errorNombre} ayuda={`Hasta ${MAX_NOMBRE} caracteres. Podrás cambiarlo después.`}>
              <input className="input" value={nombre} maxLength={MAX_NOMBRE} autoFocus onChange={(e) => { setNombre(e.target.value); setErrorNombre(null) }} />
            </Campo>
            <SelectorPaleta valor={paleta} onCambiar={setPaleta} />
          </div>
        )}
      </div>
      {paso === 1 && (
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-end gap-2 border-t border-borde p-4 sm:px-6">
          <ErrorForm mensaje={errorGeneral} />
          <button type="button" className="btn-primario" disabled={creando} onClick={crear}>{creando ? 'Creando…' : 'Crear web'}</button>
        </div>
      )}
    </div>
  )
}
