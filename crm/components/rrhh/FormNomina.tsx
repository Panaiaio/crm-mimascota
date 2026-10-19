'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subirPDF } from '@/lib/archivos'
import { MESES, rutaNomina } from '@/lib/rrhh-utils'
import { errorLegible, nombreCompleto } from '@/lib/utils'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useAviso } from '@/hooks/useAviso'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm, resumenErrores, type Errores } from '@/components/ui/Campo'
import SubirArchivo from '@/components/ui/SubirArchivo'
import Icono from '@/components/ui/Icono'

/** Subir la nómina en PDF de un trabajador (solo administradores) */
export default function FormNomina({ abierto, onCerrar, idEmpleado, onGuardada }: { abierto: boolean; onCerrar: () => void; idEmpleado?: string; onGuardada: () => void }) {
  const { empleados } = useCatalogos()
  const { aviso } = useAviso()
  const hoy = new Date()
  const [para, setPara] = useState('')
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [importe, setImporte] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setPara(idEmpleado ?? '')
    setPdf(null)
    setImporte('')
    setError(null)
  }, [abierto, idEmpleado])

  async function guardar() {
    const e: Errores = {}
    if (!para) e.para = 'Falta el trabajador. Elige de quién es la nómina.'
    if (!pdf) e.pdf = 'Falta el PDF. Pulsa «Elegir PDF» o arrástralo al recuadro.'
    if (importe && Number(importe) < 0) e.importe = 'El importe no puede ser negativo.'
    setErrores(e)
    if (Object.keys(e).length) return setError(resumenErrores(e))
    setGuardando(true)
    setError(null)
    try {
      const ruta = await subirPDF('nominas', rutaNomina(para, anio, mes), pdf!)
      const { error: err } = await createClient().from('nomina').insert({ id_empleado_fk: para, anio, mes, archivo: ruta, importe_neto: importe ? Number(importe) : null })
      if (err) throw err
      aviso('Nómina subida. El trabajador ya puede firmarla.')
      onGuardada()
      onCerrar()
    } catch (e) {
      setError(errorLegible(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Subir nómina" ancho="sm" onSubmit={guardar}
      pie={<><ErrorForm mensaje={error} /><button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button><button type="submit" className="btn-primario" disabled={guardando}><Icono nombre="subir" tamano={14} /> {guardando ? 'Subiendo…' : 'Subir nómina'}</button></>}>
      <div className="space-y-6">
        <Campo etiqueta="Trabajador" obligatorio nombre="para" error={errores.para}>
          <select className="input" value={para} onChange={(e) => setPara(e.target.value)} disabled={!!idEmpleado}>
            <option value="">Elige…</option>
            {empleados.map((e) => <option key={e.id_empleado} value={e.id_empleado}>{nombreCompleto(e)}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Mes">
          <select className="input" value={mes} onChange={(e) => setMes(Number(e.target.value))}>{MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        </Campo>
        <Campo etiqueta="Año">
          <select className="input" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>{[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => <option key={a}>{a}</option>)}</select>
        </Campo>
        <Campo etiqueta="Importe neto (€)" nombre="importe" error={errores.importe} ayuda="Opcional. Lo que cobra el trabajador."><input className="input" type="number" min={0} step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} /></Campo>
        <div>
          <span className="label">PDF de la nómina *</span>
          <SubirArchivo accept="application/pdf,.pdf" texto="Elegir PDF" ayuda="Solo PDF, hasta 10 MB" maxMB={10} archivo={pdf} onArchivo={(a, err) => { if (err) setErrores((x) => ({ ...x, pdf: err })); else { setPdf(a); setErrores(({ pdf: _, ...r }) => r) } }}>
            <span className="inline-flex size-12 items-center justify-center rounded-lg border border-borde bg-superficie-2 text-texto-2"><Icono nombre="archivo" tamano={22} /></span>
          </SubirArchivo>
          {errores.pdf && <p role="alert" className="mt-2 text-[13px] text-rose-700 dark:text-rose-400">{errores.pdf}</p>}
        </div>
      </div>
    </Modal>
  )
}
