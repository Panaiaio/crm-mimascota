'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subirPDF } from '@/lib/archivos'
import { errorLegible } from '@/lib/utils'
import { useAviso } from '@/hooks/useAviso'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm } from '@/components/ui/Campo'
import SubirArchivo from '@/components/ui/SubirArchivo'
import Icono from '@/components/ui/Icono'

const VACIO = { nombre: '', apellidos: '', correo: '', telefono: '', notas: '' }

/** Añadir un candidato con su CV a un proceso de selección */
export default function FormCandidato({ abierto, onCerrar, idProceso, puesto, onGuardado }: { abierto: boolean; onCerrar: () => void; idProceso: string; puesto: string; onGuardado: () => void }) {
  const { aviso } = useAviso()
  const [f, setF] = useState(VACIO)
  const [cv, setCv] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { if (abierto) { setF(VACIO); setCv(null); setError(null) } }, [abierto])
  const cambiar = (c: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [c]: e.target.value }))

  async function guardar() {
    if (!f.nombre.trim() || !f.correo.trim()) return setError('Nombre y correo son obligatorios')
    if (!cv) return setError('Sube el CV en PDF')
    setGuardando(true)
    setError(null)
    try {
      const ruta = await subirPDF('cvs', `${idProceso}/${Date.now()}-${f.nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, cv)
      const { error: err } = await createClient().from('candidato').insert({
        id_proceso_fk: idProceso, nombre: f.nombre.trim(), apellidos: f.apellidos.trim() || null, correo: f.correo.trim().toLowerCase(),
        telefono: f.telefono.trim() || null, notas: f.notas.trim() || null, cv: ruta,
      })
      if (err) throw err
      aviso('Candidato añadido')
      onGuardado()
      onCerrar()
    } catch (e) {
      setError(errorLegible(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nuevo candidato" subtitulo={`Proceso: ${puesto}`} onSubmit={guardar}
      pie={<><ErrorForm mensaje={error} /><button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button><button type="submit" className="btn-primario" disabled={guardando}><Icono nombre="mas" tamano={14} /> {guardando ? 'Guardando…' : 'Añadir candidato'}</button></>}>
      <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
        <Campo etiqueta="Nombre" obligatorio><input className="input" value={f.nombre} onChange={cambiar('nombre')} autoFocus /></Campo>
        <Campo etiqueta="Apellidos"><input className="input" value={f.apellidos} onChange={cambiar('apellidos')} /></Campo>
        <Campo etiqueta="Correo" obligatorio><input className="input" type="email" value={f.correo} onChange={cambiar('correo')} /></Campo>
        <Campo etiqueta="Teléfono"><input className="input" type="tel" value={f.telefono} onChange={cambiar('telefono')} /></Campo>
        <div className="sm:col-span-2">
          <span className="label">CV en PDF *</span>
          <SubirArchivo accept="application/pdf,.pdf" texto="Subir CV" ayuda="Solo PDF, hasta 5 MB" archivo={cv} onArchivo={(a, err) => { if (err) setError(err); else setCv(a) }}>
            <span className="inline-flex size-12 items-center justify-center rounded-lg border border-borde bg-superficie-2 text-texto-2"><Icono nombre="archivo" tamano={22} /></span>
          </SubirArchivo>
        </div>
        <Campo etiqueta="Notas" className="sm:col-span-2"><textarea className="input" rows={2} value={f.notas} onChange={cambiar('notas')} /></Campo>
      </div>
    </Modal>
  )
}
