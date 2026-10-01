'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SELECT_DUENOS, duenosDe, esAbierta, nombreConEspecie } from '@/lib/crm-utils'
import { errorLegible, formatDia, formatEUR, nombreCompleto } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Animal, Oportunidad, Particular } from '@/types'
import CabeceraFicha, { CifrasFicha } from '@/components/ui/CabeceraFicha'
import Etiqueta from '@/components/ui/Etiqueta'
import Seccion, { Dato } from '@/components/ui/Seccion'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FichaCargando } from '@/components/ui/Cargando'
import ListaOportunidades from '@/components/crm/ListaOportunidades'
import ListaAnimales from '@/components/crm/ListaAnimales'
import FormParticular from '@/components/crm/FormParticular'
import FormAnimal from '@/components/crm/FormAnimal'
import FormOportunidad from '@/components/crm/FormOportunidad'

type AnimalConDuenos = Animal & { animal_particular: { particular: Pick<Particular, 'id_particular' | 'nombre' | 'apellidos'> }[] }

export default function ParticularPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [modal, setModal] = useState<'editar' | 'animal' | 'oportunidad' | null>(null)
  const [compartir, setCompartir] = useState('')

  const { datos, cargando, error, recargar } = useConsulta(async (sb) => {
    const p = sinError(await sb.from('particular').select(`*,
      animal_particular(animal(id_animal, nombre, especie, raza, sexo, fecha_nacimiento, ${SELECT_DUENOS})),
      oportunidad(*, animal(id_animal, nombre, especie, raza))`).eq('id_particular', id).maybeSingle()) as
      (Particular & { animal_particular: { animal: AnimalConDuenos }[]; oportunidad: Oportunidad[] }) | null
    // Animales de otras personas (no de empresas) para poder decir "también es suyo"
    const otros = sinError(await sb.from('animal').select(`id_animal, nombre, especie, ${SELECT_DUENOS}`).is('id_empresa_fk', null).order('nombre')) as unknown as AnimalConDuenos[]
    return { p, otros }
  }, [id])

  const p = datos?.p
  useTituloPagina({ titulo: p ? nombreCompleto(p) : 'Particular', volver: { texto: 'Particulares', href: '/particulares' } }, [p?.nombre, p?.apellidos])

  const animales = useMemo(() => (p?.animal_particular ?? []).map((x) => x.animal), [p])
  const disponibles = useMemo(() => {
    const suyos = new Set(animales.map((a) => a.id_animal))
    return (datos?.otros ?? []).filter((a) => !suyos.has(a.id_animal))
  }, [datos, animales])

  if (error) return <ErrorCarga mensaje={error} reintentar={recargar} />
  if (cargando && !datos) return <FichaCargando />
  if (!p) return <Vacio icono="particular" titulo="Esta persona no existe"><Link href="/particulares" className="btn-secundario">Ver particulares</Link></Vacio>

  const abiertas = p.oportunidad.filter((o) => esAbierta(o.estado))
  const atendidas = p.oportunidad.filter((o) => o.estado === 'atendido')

  async function vincular() {
    if (!compartir || !p) return
    const { error: err } = await createClient().from('animal_particular').insert({ id_animal_fk: compartir, id_particular_fk: p.id_particular })
    if (err) return aviso(errorLegible(err), 'error')
    aviso('Animal asociado')
    setCompartir('')
    recargar()
  }

  async function quitar(a: { id_animal: string; nombre: string }) {
    if (!p) return
    if (!(await confirmar({ titulo: `¿Quitar a ${a.nombre} de ${p.nombre}?`, texto: 'El animal no se borra: sigue existiendo con sus otros dueños.', boton: 'Quitar' }))) return
    const { error: err } = await createClient().from('animal_particular').delete().eq('id_animal_fk', a.id_animal).eq('id_particular_fk', p.id_particular)
    if (err) return aviso(errorLegible(err), 'error')
    recargar()
  }

  async function eliminar() {
    if (!p) return
    if (!(await confirmar({ titulo: `¿Eliminar a ${nombreCompleto(p)}?`, texto: 'Sus animales y sus oportunidades se conservan.', boton: 'Eliminar', peligro: true }))) return
    const { error: err } = await createClient().from('particular').delete().eq('id_particular', p.id_particular)
    if (err) return aviso(errorLegible(err), 'error')
    aviso('Particular eliminado')
    router.push('/particulares')
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 pt-2 pb-10 sm:px-6">
      <CabeceraFicha
        nombre={nombreCompleto(p)}
        etiquetas={abiertas.length ? <Etiqueta punto tono="amarillo">{abiertas.length} abiertas</Etiqueta> : null}
        subtitulo={animales.length ? animales.map((a) => nombreConEspecie(a)).join(', ') : 'Sin animales'}
        acciones={
          <>
            {p.telefono && <a href={`tel:${p.telefono.replace(/\s/g, '')}`} className="btn-secundario"><Icono nombre="telefono" tamano={14} /> Llamar</a>}
            {p.correo && <a href={`mailto:${p.correo}`} className="btn-secundario"><Icono nombre="correo" tamano={14} /> Email</a>}
            <button type="button" className="btn-primario" onClick={() => setModal('oportunidad')}><Icono nombre="mas" tamano={14} /> Nueva oportunidad</button>
            <Menu opciones={[
              { texto: 'Editar datos', icono: 'lapiz', onClick: () => setModal('editar') },
              { texto: 'Eliminar', icono: 'papelera', onClick: eliminar, peligro: true, oculto: !esAdmin },
            ]} />
          </>
        }
      >
        <CifrasFicha cifras={[
          { etiqueta: 'Animales', valor: animales.length },
          { etiqueta: 'Oportunidades abiertas', valor: abiertas.length },
          { etiqueta: 'Valor en curso', valor: formatEUR(abiertas.reduce((s, o) => s + Number(o.valor), 0)) },
          { etiqueta: 'Gastado en la clínica', valor: formatEUR(atendidas.reduce((s, o) => s + Number(o.valor), 0)) },
        ]} />
      </CabeceraFicha>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Seccion titulo={`Sus animales (${animales.length})`} acciones={<button type="button" className="btn-secundario" onClick={() => setModal('animal')}><Icono nombre="mas" tamano={14} /> Nuevo animal</button>}>
            <ListaAnimales
              animales={animales}
              onQuitar={quitar}
              vacio="Todavía no tiene animales"
              extra={(a) => {
                const otros = duenosDe(a as AnimalConDuenos).filter((d) => d.id_particular !== p.id_particular)
                return otros.length ? <p className="text-[12px] text-texto-3">También de {otros.map((d) => d.nombre).join(' y ')}</p> : null
              }}
            />
            <div className="mt-4 flex flex-col gap-2 border-t border-borde pt-4 sm:flex-row sm:items-end">
              <label className="flex-1">
                <span className="label">¿Comparte un animal con otra persona? (por ejemplo, el gato de su pareja)</span>
                <select className="input" value={compartir} onChange={(e) => setCompartir(e.target.value)}>
                  <option value="">Elige un animal ya registrado…</option>
                  {disponibles.map((a) => {
                    const d = duenosDe(a)
                    return <option key={a.id_animal} value={a.id_animal}>{nombreConEspecie(a)} · {d.length ? 'de ' + d.map((x) => nombreCompleto(x)).join(' y ') : 'sin dueño'}</option>
                  })}
                </select>
              </label>
              <button type="button" className="btn-secundario h-9" disabled={!compartir} onClick={vincular}><Icono nombre="enlace" tamano={14} /> Asociar</button>
            </div>
          </Seccion>
          <Seccion titulo={`Oportunidades (${p.oportunidad.length})`} sinPadding>
            <ListaOportunidades oportunidades={p.oportunidad} vacio="Aún no ha hecho ninguna consulta" />
          </Seccion>
        </div>
        <Seccion titulo="Datos">
          <dl>
            <Dato etiqueta="Teléfono">{p.telefono ? <a href={`tel:${p.telefono.replace(/\s/g, '')}`} className="enlace">{p.telefono}</a> : '—'}</Dato>
            <Dato etiqueta="Correo">{p.correo ? <a href={`mailto:${p.correo}`} className="enlace">{p.correo}</a> : '—'}</Dato>
            <Dato etiqueta="Ciudad">{p.ciudad ?? '—'}</Dato>
            <Dato etiqueta="Cliente desde">{formatDia(p.fecha_creacion)}</Dato>
            {p.notas && <Dato etiqueta="Notas"><span className="whitespace-pre-line">{p.notas}</span></Dato>}
          </dl>
        </Seccion>
      </div>

      <FormParticular abierto={modal === 'editar'} particular={p} onCerrar={() => setModal(null)} onGuardado={() => recargar()} />
      <FormAnimal abierto={modal === 'animal'} particularId={p.id_particular} onCerrar={() => setModal(null)} onGuardado={() => recargar()} />
      <FormOportunidad abierto={modal === 'oportunidad'} inicial={{ id_particular_fk: p.id_particular }} onCerrar={() => setModal(null)} onGuardada={(idO) => router.push(`/oportunidades/${idO}`)} />
    </div>
  )
}
