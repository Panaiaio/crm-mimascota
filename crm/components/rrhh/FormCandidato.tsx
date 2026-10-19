'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subirPDF } from '@/lib/archivos'
import { errorLegible } from '@/lib/utils'
import { useAviso } from '@/hooks/useAviso'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm, resumenErrores, type Errores } from '@/components/ui/Campo'
import SubirArchivo from '@/components/ui/SubirArchivo'
import Icono from '@/components/ui/Icono'

const VACIO = { nombre: '', apellidos: '', correo: '', telefono: '', notas: '' }

/** Añadir un candidato con su CV a uno de los procesos de selección abiertos */
export default function FormCandidato({ abierto, onCerrar, procesos, idInicial, onGuardado }: {
  abierto: boolean
  onCerrar: () => void
  procesos: { id_proceso: string; puesto: string }[]
  idInicial?: string
  onGuardado: () => void
}) {
  const { aviso } = useAviso()
  const [f, setF] = useState(VACIO)
  const [cv, setCv] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)
  const [idProceso, setIdProceso] = useState('')

  useEffect(() => {
    if (!abierto) return
    setF(VACIO); setCv(null); setError(null); setErrores({})
    setIdProceso(procesos.some((p) => p.id_proceso === idInicial) ? idInicial! : procesos.length === 1 ? procesos[0].id_proceso : '')
  }, [abierto]) // eslint-disable-line react-hooks/exhaustive-deps
  const cambiar = (c: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setF((x) => ({ ...x, [c]: e.target.value })); setErrores(({ [c]: _, ...r }) => r) }

  async function guardar() {
    const e: Errores = {}
    if (!idProceso) e.proceso = 'Falta el proceso. Elige a qué puesto se presenta.'
    if (!f.nombre.trim()) e.nombre = 'Falta el nombre del candidato.'
    if (!f.correo.trim()) e.correo = 'Falta el correo. Lo necesitas para contactar con él, por ejemplo paula@gmail.com.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim())) e.correo = 'Falta algo en el correo. Escríbelo completo, por ejemplo paula@gmail.com.'
    if (f.telefono.trim() && f.telefono.replace(/\D/g, '').length !== 9) e.telefono = 'Faltan o sobran cifras. El teléfono tiene 9, por ejemplo 612 345 678.'
    if (!cv) e.cv = 'Falta el CV. Pulsa «Subir CV» y elige el PDF.'
    setErrores(e)
    if (Object.keys(e).length) return setError(resumenErrores(e))
    setGuardando(true)
    setError(null)
    try {
      const ruta = await subirPDF('cvs', `${idProceso}/${Date.now()}-${f.nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, cv!)
      const { error: err } = await createClient().from('candidato').insert({
        id_proceso_fk: idProceso, nombre: f.nombre.trim(), apellidos: f.apellidos.trim() || null, correo: f.correo.trim().toLowerCase(),
        telefono: f.telefono.trim() || null, notas: f.notas.trim() || null, cv: ruta,
      })
      if (err) throw err
      aviso(`${f.nombre.trim()} añadido al proceso`)
      onGuardado()
      onCerrar()
    } catch (e) {
      setError(errorLegible(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nuevo candidato" onSubmit={guardar}
      pie={<><ErrorForm mensaje={error} /><button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button><button type="submit" className="btn-primario" disabled={guardando}><Icono nombre="mas" tamano={14} /> {guardando ? 'Guardando…' : 'Añadir candidato'}</button></>}>
      <div className="space-y-6">
        <Campo etiqueta="Proceso de selección" obligatorio nombre="proceso" error={errores.proceso}>
          <select className="input" value={idProceso} onChange={(e) => setIdProceso(e.target.value)}>
            <option value="">Elige…</option>
            {procesos.map((p) => <option key={p.id_proceso} value={p.id_proceso}>{p.puesto}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Nombre" obligatorio nombre="nombre" error={errores.nombre}><input className="input" value={f.nombre} onChange={cambiar('nombre')} autoFocus /></Campo>
        <Campo etiqueta="Apellidos"><input className="input" value={f.apellidos} onChange={cambiar('apellidos')} /></Campo>
        <Campo etiqueta="Correo" obligatorio nombre="correo" error={errores.correo}><input className="input" type="email" value={f.correo} onChange={cambiar('correo')} /></Campo>
        <Campo etiqueta="Teléfono" nombre="telefono" error={errores.telefono}><input className="input" type="tel" value={f.telefono} onChange={cambiar('telefono')} /></Campo>
        <div>
          <span className="label">CV en PDF *</span>
          <SubirArchivo accept="application/pdf,.pdf" texto="Subir CV" ayuda="Solo PDF, hasta 5 MB" archivo={cv} onArchivo={(a, err) => { if (err) setErrores((x) => ({ ...x, cv: err })); else { setCv(a); setErrores(({ cv: _, ...r }) => r) } }}>
            <span className="inline-flex size-12 items-center justify-center rounded-lg border border-borde bg-superficie-2 text-texto-2"><Icono nombre="archivo" tamano={22} /></span>
          </SubirArchivo>
          {errores.cv && <p role="alert" className="mt-2 text-[13px] text-rose-700 dark:text-rose-400">{errores.cv}</p>}
        </div>
        <Campo etiqueta="Notas"><textarea className="input" rows={2} value={f.notas} onChange={cambiar('notas')} /></Campo>
      </div>
    </Modal>
  )
}
