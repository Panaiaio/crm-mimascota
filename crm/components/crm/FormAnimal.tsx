'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ESPECIES_SUGERIDAS } from '@/lib/crm-utils'
import { cn, errorLegible, hoyISO, nombreCompleto } from '@/lib/utils'
import { useAviso } from '@/hooks/useAviso'
import type { AnimalBase } from '@/types'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm } from '@/components/ui/Campo'
import Icono from '@/components/ui/Icono'

const VACIO = { nombre: '', especie: '', raza: '', sexo: '', fecha_nacimiento: '', microchip: '', notas: '' }

/**
 * Crear o editar un animal. Al crearlo se elige su dueño: una empresa o un particular
 * (si viene de la ficha de una empresa o de un particular, ya va asignado).
 */
export default function FormAnimal({
  abierto,
  onCerrar,
  animal,
  empresaId,
  particularId,
  onGuardado,
}: {
  abierto: boolean
  onCerrar: () => void
  animal?: AnimalBase | null
  empresaId?: string
  particularId?: string
  onGuardado: (id: string) => void
}) {
  const { aviso } = useAviso()
  const [f, setF] = useState(VACIO)
  const [tipoDueno, setTipoDueno] = useState<'particular' | 'empresa'>('particular')
  const [dueno, setDueno] = useState('')
  const [opciones, setOpciones] = useState<{ particulares: { id: string; texto: string }[]; empresas: { id: string; texto: string }[] }>({ particulares: [], empresas: [] })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const elegirDueno = !animal && !empresaId && !particularId

  useEffect(() => {
    if (!abierto) return
    setF(animal ? {
      nombre: animal.nombre, especie: animal.especie, raza: animal.raza ?? '', sexo: animal.sexo ?? '',
      fecha_nacimiento: animal.fecha_nacimiento ?? '', microchip: animal.microchip ?? '', notas: animal.notas ?? '',
    } : VACIO)
    setError(null)
    setDueno('')
    if (elegirDueno) {
      const sb = createClient()
      Promise.all([
        sb.from('particular').select('id_particular, nombre, apellidos').order('nombre'),
        sb.from('empresa').select('id_empresa, nombre').order('nombre'),
      ]).then(([p, e]) => setOpciones({
        particulares: (p.data ?? []).map((x) => ({ id: x.id_particular, texto: nombreCompleto(x) })),
        empresas: (e.data ?? []).map((x) => ({ id: x.id_empresa, texto: x.nombre })),
      }))
    }
  }, [abierto, animal, elegirDueno])

  const cambiar = (campo: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [campo]: e.target.value }))

  async function guardar() {
    if (!f.nombre.trim()) return setError('El nombre es obligatorio')
    if (!f.especie.trim()) return setError('Indica qué animal es')
    if (elegirDueno && !dueno) return setError('Elige su dueño')
    setGuardando(true)
    setError(null)
    try {
      const sb = createClient()
      const idEmpresa = empresaId ?? (elegirDueno && tipoDueno === 'empresa' ? dueno : null)
      const idParticular = particularId ?? (elegirDueno && tipoDueno === 'particular' ? dueno : null)
      const datos = {
        nombre: f.nombre.trim(), especie: f.especie.trim().toLowerCase(), raza: f.raza.trim() || null,
        sexo: f.sexo || null, fecha_nacimiento: f.fecha_nacimiento || null, microchip: f.microchip.trim() || null,
        notas: f.notas.trim() || null, ...(animal ? {} : { id_empresa_fk: idEmpresa }),
      }
      const r = animal
        ? await sb.from('animal').update(datos).eq('id_animal', animal.id_animal).select('id_animal').single()
        : await sb.from('animal').insert(datos).select('id_animal').single()
      if (r.error) throw r.error
      if (!animal && idParticular) {
        const v = await sb.from('animal_particular').insert({ id_animal_fk: r.data.id_animal, id_particular_fk: idParticular })
        if (v.error) throw v.error
      }
      aviso(animal ? 'Animal guardado' : 'Animal añadido')
      onGuardado(r.data.id_animal)
      onCerrar()
    } catch (e) {
      setError(errorLegible(e))
    } finally {
      setGuardando(false)
    }
  }

  const lista = tipoDueno === 'empresa' ? opciones.empresas : opciones.particulares

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={animal ? `Editar a ${animal.nombre}` : 'Nuevo animal'}
      onSubmit={guardar}
      pie={
        <>
          <ErrorForm mensaje={error} />
          <button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn-primario" disabled={guardando}>
            {!animal && <Icono nombre="mas" tamano={14} />} {guardando ? 'Guardando…' : animal ? 'Guardar cambios' : 'Añadir animal'}
          </button>
        </>
      }
    >
      {elegirDueno && (
        <div className="seccion-form">
          <p className="titulo-seccion">Dueño</p>
          <div className="mb-3 inline-flex rounded-lg border border-borde bg-superficie-2 p-0.5">
            {(['particular', 'empresa'] as const).map((t) => (
              <button key={t} type="button" onClick={() => { setTipoDueno(t); setDueno('') }}
                className={cn('h-7 rounded-md px-3 text-[13px]', tipoDueno === t ? 'bg-superficie font-medium text-texto shadow-sm' : 'text-texto-3')}>
                {t === 'particular' ? 'Particular' : 'Empresa'}
              </button>
            ))}
          </div>
          <select className="input" value={dueno} onChange={(e) => setDueno(e.target.value)} aria-label="Dueño">
            <option value="">Elige {tipoDueno === 'empresa' ? 'la empresa' : 'la persona'}…</option>
            {lista.map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
          </select>
          {tipoDueno === 'empresa' && <p className="mt-1.5 text-[12px] text-texto-3">Un animal de empresa pertenece solo a esa empresa.</p>}
        </div>
      )}
      <div className="seccion-form">
        <p className="titulo-seccion">Animal</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre" obligatorio><input className="input" value={f.nombre} onChange={cambiar('nombre')} autoFocus /></Campo>
          <Campo etiqueta="¿Qué animal es?" obligatorio>
            <input className="input" list="especies-animal" value={f.especie} onChange={cambiar('especie')} placeholder="perro, gato, papagayo…" />
            <datalist id="especies-animal">{ESPECIES_SUGERIDAS.map((e) => <option key={e} value={e} />)}</datalist>
          </Campo>
          <Campo etiqueta="Raza"><input className="input" value={f.raza} onChange={cambiar('raza')} /></Campo>
          <Campo etiqueta="Sexo">
            <select className="input" value={f.sexo} onChange={cambiar('sexo')}>
              <option value="">Sin indicar</option>
              <option value="macho">Macho</option>
              <option value="hembra">Hembra</option>
            </select>
          </Campo>
          <Campo etiqueta="Fecha de nacimiento"><input className="input" type="date" max={hoyISO()} value={f.fecha_nacimiento} onChange={cambiar('fecha_nacimiento')} /></Campo>
          <Campo etiqueta="Microchip"><input className="input" value={f.microchip} onChange={cambiar('microchip')} /></Campo>
          <Campo etiqueta="Notas" className="sm:col-span-2"><textarea className="input" rows={2} value={f.notas} onChange={cambiar('notas')} placeholder="Alergias, carácter…" /></Campo>
        </div>
      </div>
    </Modal>
  )
}
