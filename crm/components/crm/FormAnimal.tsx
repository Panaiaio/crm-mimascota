'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ESPECIES_SUGERIDAS } from '@/lib/crm-utils'
import { cn, errorLegible, hoyISO, nombreCompleto } from '@/lib/utils'
import { useAviso } from '@/hooks/useAviso'
import type { AnimalBase } from '@/types'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm, resumenErrores, type Errores } from '@/components/ui/Campo'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
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
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)
  const elegirDueno = !animal && !empresaId && !particularId

  useEffect(() => {
    if (!abierto) return
    setF(animal ? {
      nombre: animal.nombre, especie: animal.especie, raza: animal.raza ?? '', sexo: animal.sexo ?? '',
      fecha_nacimiento: animal.fecha_nacimiento ?? '', microchip: animal.microchip ?? '', notas: animal.notas ?? '',
    } : VACIO)
    setError(null)
    setErrores({})
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

  const cambiar = (campo: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF((x) => ({ ...x, [campo]: e.target.value }))
    if (errores[campo]) setErrores(({ [campo]: _, ...r }) => r)
  }

  async function guardar() {
    const e: Errores = {}
    if (elegirDueno && !dueno) e.dueno = `Falta el dueño. Busca ${tipoDueno === 'empresa' ? 'la empresa' : 'a la persona'} por su nombre.`
    if (!f.nombre.trim()) e.nombre = 'Falta el nombre del animal, por ejemplo «Kiko».'
    if (!f.especie.trim()) e.especie = 'Falta qué animal es. Escribe, por ejemplo, perro, gato o papagayo.'
    setErrores(e)
    if (Object.keys(e).length) return setError(resumenErrores(e))
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
      aviso(animal ? `${datos.nombre} guardado` : `${datos.nombre} añadido`, 'exito', animal ? {} : { ver: `/animales/${r.data.id_animal}` })
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
            {guardando ? 'Guardando…' : animal ? 'Guardar cambios' : 'Añadir animal'}
          </button>
        </>
      }
    >
      {elegirDueno && (
        <div className="seccion-form">
          <p className="titulo-seccion">Dueño</p>
          <div role="radiogroup" aria-label="Tipo de dueño" className="mb-4 inline-flex rounded-lg border border-borde bg-superficie-2">
            {(['particular', 'empresa'] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tipoDueno === t} onClick={() => { setTipoDueno(t); setDueno('') }}
                className={cn('h-11 rounded-lg px-4 text-[14px]', tipoDueno === t ? 'bg-superficie font-medium text-texto shadow-sm ring-1 ring-borde' : 'text-texto-3 hover:text-texto')}>
                {t === 'particular' ? 'Particular' : 'Empresa'}
              </button>
            ))}
          </div>
          <Campo etiqueta={tipoDueno === 'empresa' ? 'Empresa' : 'Persona'} obligatorio nombre="dueno" error={errores.dueno}
            ayuda={tipoDueno === 'empresa' ? 'Un animal de empresa pertenece solo a esa empresa.' : 'Escribe su nombre para buscarla.'}>
            <SelectorBuscable key={tipoDueno} valor={dueno} opciones={lista} invalido={!!errores.dueno}
              onChange={(id) => { setDueno(id); if (id) setErrores(({ dueno: _, ...r }) => r) }} ayuda={tipoDueno === 'empresa' ? 'Buscar empresa…' : 'Buscar persona…'} />
          </Campo>
        </div>
      )}
      <div className="seccion-form">
        <p className="titulo-seccion">Animal</p>
        <div className="space-y-6">
          <Campo etiqueta="Nombre" obligatorio nombre="nombre" error={errores.nombre}><input className="input" value={f.nombre} onChange={cambiar('nombre')} autoFocus={!elegirDueno} /></Campo>
          <Campo etiqueta="¿Qué animal es?" obligatorio nombre="especie" error={errores.especie} ayuda="Perro, gato, papagayo, suricato…">
            <input className="input" list="especies-animal" value={f.especie} onChange={cambiar('especie')} />
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
          <Campo etiqueta="Notas" ayuda="Alergias, carácter, cuidados…"><textarea className="input" rows={2} value={f.notas} onChange={cambiar('notas')} /></Campo>
        </div>
      </div>
    </Modal>
  )
}
