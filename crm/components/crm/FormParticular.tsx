'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ESPECIES_SUGERIDAS } from '@/lib/crm-utils'
import { errorLegible } from '@/lib/utils'
import { useAviso } from '@/hooks/useAviso'
import type { ParticularBase } from '@/types'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm } from '@/components/ui/Campo'
import Icono from '@/components/ui/Icono'

const VACIO = { nombre: '', apellidos: '', telefono: '', correo: '', ciudad: '', notas: '', animal: '', especie: '' }

/** Crear o editar un particular (al crearlo se puede añadir ya su primer animal) */
export default function FormParticular({
  abierto,
  onCerrar,
  particular,
  onGuardado,
}: {
  abierto: boolean
  onCerrar: () => void
  particular?: ParticularBase | null
  onGuardado: (id: string) => void
}) {
  const { aviso } = useAviso()
  const [f, setF] = useState(VACIO)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setF(particular ? {
      ...VACIO, nombre: particular.nombre, apellidos: particular.apellidos ?? '', telefono: particular.telefono ?? '',
      correo: particular.correo ?? '', ciudad: particular.ciudad ?? '', notas: particular.notas ?? '',
    } : VACIO)
    setError(null)
  }, [abierto, particular])

  const cambiar = (campo: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [campo]: e.target.value }))

  async function guardar() {
    if (!f.nombre.trim()) return setError('El nombre es obligatorio')
    if (f.animal.trim() && !f.especie.trim()) return setError('Indica qué animal es (perro, gato…)')
    setGuardando(true)
    setError(null)
    try {
      const sb = createClient()
      const datos = {
        nombre: f.nombre.trim(), apellidos: f.apellidos.trim() || null, telefono: f.telefono.trim() || null,
        correo: f.correo.trim().toLowerCase() || null, ciudad: f.ciudad.trim() || null, notas: f.notas.trim() || null,
      }
      const r = particular
        ? await sb.from('particular').update(datos).eq('id_particular', particular.id_particular).select('id_particular').single()
        : await sb.from('particular').insert(datos).select('id_particular').single()
      if (r.error) throw r.error
      const id = r.data.id_particular as string
      if (!particular && f.animal.trim()) {
        const a = await sb.from('animal').insert({ nombre: f.animal.trim(), especie: f.especie.trim().toLowerCase() }).select('id_animal').single()
        if (a.error) throw a.error
        const v = await sb.from('animal_particular').insert({ id_animal_fk: a.data.id_animal, id_particular_fk: id })
        if (v.error) throw v.error
      }
      aviso(particular ? 'Datos guardados' : 'Particular creado')
      onGuardado(id)
      onCerrar()
    } catch (e) {
      setError(errorLegible(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={particular ? 'Editar particular' : 'Nuevo particular'}
      onSubmit={guardar}
      pie={
        <>
          <ErrorForm mensaje={error} />
          <button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn-primario" disabled={guardando}>
            {!particular && <Icono nombre="mas" tamano={14} />} {guardando ? 'Guardando…' : particular ? 'Guardar cambios' : 'Crear particular'}
          </button>
        </>
      }
    >
      <div className="seccion-form">
        <p className="titulo-seccion">Persona</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre" obligatorio><input className="input" value={f.nombre} onChange={cambiar('nombre')} autoFocus /></Campo>
          <Campo etiqueta="Apellidos"><input className="input" value={f.apellidos} onChange={cambiar('apellidos')} /></Campo>
          <Campo etiqueta="Teléfono"><input className="input" type="tel" value={f.telefono} onChange={cambiar('telefono')} /></Campo>
          <Campo etiqueta="Correo"><input className="input" type="email" value={f.correo} onChange={cambiar('correo')} /></Campo>
          <Campo etiqueta="Ciudad"><input className="input" value={f.ciudad} onChange={cambiar('ciudad')} /></Campo>
          <Campo etiqueta="Notas" className="sm:col-span-2"><textarea className="input" rows={2} value={f.notas} onChange={cambiar('notas')} /></Campo>
        </div>
      </div>
      {!particular && (
        <div className="seccion-form">
          <p className="titulo-seccion">Su animal (opcional)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombre del animal"><input className="input" value={f.animal} onChange={cambiar('animal')} placeholder="Kiko" /></Campo>
            <Campo etiqueta="¿Qué animal es?">
              <input className="input" list="especies" value={f.especie} onChange={cambiar('especie')} placeholder="perro, gato, papagayo…" />
              <datalist id="especies">{ESPECIES_SUGERIDAS.map((e) => <option key={e} value={e} />)}</datalist>
            </Campo>
          </div>
        </div>
      )}
    </Modal>
  )
}
