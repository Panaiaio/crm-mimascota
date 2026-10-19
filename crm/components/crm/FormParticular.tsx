'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ESPECIES_SUGERIDAS } from '@/lib/crm-utils'
import { errorLegible } from '@/lib/utils'
import { useAviso } from '@/hooks/useAviso'
import type { ParticularBase } from '@/types'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm, resumenErrores, type Errores } from '@/components/ui/Campo'

const VACIO = { nombre: '', apellidos: '', telefono: '', correo: '', ciudad: '', notas: '', animal: '', especie: '' }

/** Rellena el formulario con lo escrito en el buscador: si son cifras es el teléfono; si no, nombre y apellidos */
function desdeTexto(texto?: string) {
  const t = (texto ?? '').trim()
  if (!t) return VACIO
  if (/^[\d\s+]+$/.test(t)) return { ...VACIO, telefono: t }
  const [nombre, ...resto] = t.split(/\s+/)
  return { ...VACIO, nombre, apellidos: resto.join(' ') }
}

/** Crear o editar un particular (al crearlo se puede añadir ya su primer animal) */
export default function FormParticular({
  abierto,
  onCerrar,
  particular,
  nombreInicial,
  onGuardado,
}: {
  abierto: boolean
  onCerrar: () => void
  particular?: ParticularBase | null
  /** Lo escrito en un buscador ("+ Crear particular «Lucía Gómez»"): se usa para rellenar el nombre o el teléfono */
  nombreInicial?: string
  onGuardado: (id: string) => void
}) {
  const { aviso } = useAviso()
  const [f, setF] = useState(VACIO)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setF(particular ? {
      ...VACIO, nombre: particular.nombre, apellidos: particular.apellidos ?? '', telefono: particular.telefono ?? '',
      correo: particular.correo ?? '', ciudad: particular.ciudad ?? '', notas: particular.notas ?? '',
    } : desdeTexto(nombreInicial))
    setError(null)
    setErrores({})
  }, [abierto, particular, nombreInicial])

  const cambiar = (campo: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setF((x) => ({ ...x, [campo]: e.target.value }))
    if (errores[campo]) setErrores(({ [campo]: _, ...r }) => r)
  }

  async function guardar() {
    const e: Errores = {}
    if (!f.nombre.trim()) e.nombre = 'Falta el nombre. Escribe al menos el nombre de pila, por ejemplo «Lucía».'
    if (f.telefono.trim() && f.telefono.replace(/\D/g, '').length !== 9) e.telefono = 'Faltan o sobran cifras. El teléfono tiene 9, por ejemplo 612 345 678.'
    if (f.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim())) e.correo = 'Falta algo en el correo. Escríbelo completo, por ejemplo lucia@gmail.com.'
    if (f.animal.trim() && !f.especie.trim()) e.especie = 'Falta qué animal es. Escribe, por ejemplo, perro, gato o papagayo.'
    setErrores(e)
    if (Object.keys(e).length) return setError(resumenErrores(e))
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
      aviso(particular ? `Datos de ${datos.nombre} guardados` : `Particular ${datos.nombre} creado`, 'exito', particular ? {} : { ver: `/particulares/${id}` })
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
            {guardando ? 'Guardando…' : particular ? 'Guardar cambios' : 'Crear particular'}
          </button>
        </>
      }
    >
      <div className="seccion-form">
        <p className="titulo-seccion">Persona</p>
        <div className="space-y-6">
          <Campo etiqueta="Nombre" obligatorio nombre="nombre" error={errores.nombre}><input className="input" value={f.nombre} onChange={cambiar('nombre')} autoFocus /></Campo>
          <Campo etiqueta="Apellidos"><input className="input" value={f.apellidos} onChange={cambiar('apellidos')} /></Campo>
          <Campo etiqueta="Teléfono" nombre="telefono" error={errores.telefono} ayuda="9 cifras, por ejemplo 612 345 678."><input className="input" type="tel" value={f.telefono} onChange={cambiar('telefono')} /></Campo>
          <Campo etiqueta="Correo" nombre="correo" error={errores.correo}><input className="input" type="email" value={f.correo} onChange={cambiar('correo')} /></Campo>
          <Campo etiqueta="Ciudad"><input className="input" value={f.ciudad} onChange={cambiar('ciudad')} /></Campo>
          <Campo etiqueta="Notas"><textarea className="input" rows={2} value={f.notas} onChange={cambiar('notas')} /></Campo>
        </div>
      </div>
      {!particular && (
        <div className="seccion-form">
          <p className="titulo-seccion">Su animal (opcional)</p>
          <div className="space-y-6">
            <Campo etiqueta="Nombre del animal" ayuda="Por ejemplo, Kiko."><input className="input" value={f.animal} onChange={cambiar('animal')} /></Campo>
            <Campo etiqueta="¿Qué animal es?" nombre="especie" error={errores.especie}>
              <input className="input" list="especies" value={f.especie} onChange={cambiar('especie')} placeholder="perro, gato, papagayo…" />
              <datalist id="especies">{ESPECIES_SUGERIDAS.map((e) => <option key={e} value={e} />)}</datalist>
            </Campo>
          </div>
        </div>
      )}
    </Modal>
  )
}
