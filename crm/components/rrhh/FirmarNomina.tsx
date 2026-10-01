'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { abrirPrivado } from '@/lib/archivos'
import { MESES } from '@/lib/rrhh-utils'
import { errorLegible } from '@/lib/utils'
import { useAviso } from '@/hooks/useAviso'
import type { Nomina } from '@/types'
import Modal from '@/components/ui/Modal'
import { ErrorForm } from '@/components/ui/Campo'
import Icono from '@/components/ui/Icono'

/** El trabajador revisa su nómina y la firma dibujando con el ratón o el dedo */
export default function FirmarNomina({ nomina, onCerrar, onFirmada }: { nomina: Nomina | null; onCerrar: () => void; onFirmada: () => void }) {
  const { aviso } = useAviso()
  const lienzo = useRef<HTMLCanvasElement>(null)
  const dibujando = useRef(false)
  const [trazos, setTrazos] = useState(0)
  const [acepto, setAcepto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!nomina) return
    setTrazos(0)
    setAcepto(false)
    setError(null)
    // Preparar el lienzo con la resolución de la pantalla
    requestAnimationFrame(() => {
      const c = lienzo.current
      if (!c) return
      const r = c.getBoundingClientRect()
      const escala = window.devicePixelRatio || 1
      c.width = r.width * escala
      c.height = r.height * escala
      const ctx = c.getContext('2d')!
      ctx.scale(escala, escala)
      ctx.lineWidth = 2.2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#111111'
    })
  }, [nomina])

  function punto(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function empezar(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = e.currentTarget.getContext('2d')!
    const p = punto(e)
    dibujando.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return
    const ctx = e.currentTarget.getContext('2d')!
    const p = punto(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  function terminar() {
    if (dibujando.current) setTrazos((t) => t + 1)
    dibujando.current = false
  }

  function borrar() {
    const c = lienzo.current
    if (!c) return
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setTrazos(0)
  }

  async function firmar() {
    if (!nomina || !lienzo.current) return
    if (!trazos) return setError('Dibuja tu firma en el recuadro')
    if (!acepto) return setError('Marca la casilla de conformidad')
    setEnviando(true)
    const { error: err } = await createClient().rpc('firmar_nomina', { p_id_nomina: nomina.id_nomina, p_firma: lienzo.current.toDataURL('image/png') })
    setEnviando(false)
    if (err) return setError(errorLegible(err))
    aviso('Nómina firmada')
    onFirmada()
    onCerrar()
  }

  const periodo = nomina ? `${MESES[nomina.mes - 1]} ${nomina.anio}` : ''

  return (
    <Modal abierto={!!nomina} onCerrar={onCerrar} titulo={`Firmar nómina de ${periodo}`} subtitulo="Revisa el PDF antes de firmar. Una vez firmada no se puede cambiar." onSubmit={firmar}
      pie={<><ErrorForm mensaje={error} /><button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button><button type="submit" className="btn-primario" disabled={enviando}><Icono nombre="firma" tamano={14} /> {enviando ? 'Firmando…' : 'Firmar'}</button></>}>
      <div className="space-y-4 px-6 py-5">
        <button type="button" className="btn-secundario" onClick={() => nomina && abrirPrivado('nominas', nomina.archivo).catch((e) => setError(errorLegible(e)))}>
          <Icono nombre="archivo" tamano={14} /> Ver el PDF de la nómina
        </button>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label !mb-0">Tu firma</span>
            <button type="button" onClick={borrar} className="text-[12.5px] text-texto-3 hover:text-texto">Borrar</button>
          </div>
          <canvas
            ref={lienzo}
            onPointerDown={empezar}
            onPointerMove={mover}
            onPointerUp={terminar}
            onPointerLeave={terminar}
            aria-label="Recuadro para firmar"
            className="h-44 w-full touch-none rounded-xl border border-dashed border-borde bg-white"
          />
        </div>
        <label className="flex items-start gap-2.5 text-[13px] text-texto-2">
          <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primario)]" />
          He revisado la nómina de {periodo} y la firmo en señal de conformidad.
        </label>
      </div>
    </Modal>
  )
}
