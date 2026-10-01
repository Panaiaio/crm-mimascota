'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SELECT_DUENOS, duenosDe, tonoDeTexto } from '@/lib/crm-utils'
import { edad, errorLegible, formatDia, formatEUR, formatFecha, nombreCompleto } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Animal, Oportunidad, Particular } from '@/types'
import CabeceraFicha, { CifrasFicha } from '@/components/ui/CabeceraFicha'
import Etiqueta from '@/components/ui/Etiqueta'
import Avatar from '@/components/ui/Avatar'
import Seccion, { Dato } from '@/components/ui/Seccion'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FichaCargando } from '@/components/ui/Cargando'
import ListaOportunidades from '@/components/crm/ListaOportunidades'
import FormAnimal from '@/components/crm/FormAnimal'
import FormOportunidad from '@/components/crm/FormOportunidad'

export default function AnimalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [modal, setModal] = useState<'editar' | 'oportunidad' | null>(null)
  const [nuevoDueno, setNuevoDueno] = useState('')

  const { datos, cargando, error, recargar } = useConsulta(async (sb) => {
    const a = sinError(await sb.from('animal').select(`*, empresa(id_empresa, nombre, logo), ${SELECT_DUENOS}, oportunidad(*, animal(id_animal, nombre, especie, raza))`)
      .eq('id_animal', id).maybeSingle()) as (Animal & { oportunidad: Oportunidad[] }) | null
    const personas = sinError(await sb.from('particular').select('id_particular, nombre, apellidos').order('nombre')) as Pick<Particular, 'id_particular' | 'nombre' | 'apellidos'>[]
    return { a, personas }
  }, [id])

  const a = datos?.a
  useTituloPagina({ titulo: a?.nombre ?? 'Animal', volver: { texto: 'Animales', href: '/animales' } }, [a?.nombre])

  if (error) return <ErrorCarga mensaje={error} reintentar={recargar} />
  if (cargando && !datos) return <FichaCargando />
  if (!a) return <Vacio icono="animal" titulo="Este animal no existe"><Link href="/animales" className="btn-secundario">Ver animales</Link></Vacio>

  const duenos = duenosDe(a)
  const visitas = a.oportunidad.filter((o) => o.estado === 'atendido')
  const ultima = visitas.map((o) => o.fecha_cita ?? o.fecha_creacion).sort().at(-1)

  async function anadirDueno() {
    if (!nuevoDueno || !a) return
    const { error: err } = await createClient().from('animal_particular').insert({ id_animal_fk: a.id_animal, id_particular_fk: nuevoDueno })
    if (err) return aviso(errorLegible(err), 'error')
    aviso('Dueño añadido')
    setNuevoDueno('')
    recargar()
  }

  async function quitarDueno(idParticular: string, nombre: string) {
    if (!a) return
    if (!(await confirmar({ titulo: `¿Quitar a ${nombre} como dueño de ${a.nombre}?`, boton: 'Quitar' }))) return
    const { error: err } = await createClient().from('animal_particular').delete().eq('id_animal_fk', a.id_animal).eq('id_particular_fk', idParticular)
    if (err) return aviso(errorLegible(err), 'error')
    recargar()
  }

  async function eliminar() {
    if (!a) return
    if (!(await confirmar({ titulo: `¿Eliminar a ${a.nombre}?`, texto: 'Sus oportunidades se conservan sin animal.', boton: 'Eliminar', peligro: true }))) return
    const { error: err } = await createClient().from('animal').delete().eq('id_animal', a.id_animal)
    if (err) return aviso(errorLegible(err), 'error')
    aviso('Animal eliminado')
    router.push('/animales')
  }

  const especie = a.especie[0].toUpperCase() + a.especie.slice(1)

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 pt-2 pb-10 sm:px-6">
      <CabeceraFicha
        nombre={a.nombre}
        foto={a.foto}
        etiquetas={<Etiqueta tono={tonoDeTexto(a.especie)}>{especie}</Etiqueta>}
        subtitulo={[a.raza, a.sexo, a.fecha_nacimiento ? edad(a.fecha_nacimiento) : null].filter(Boolean).join(' · ') || 'Sin más datos'}
        acciones={
          <>
            <button type="button" className="btn-primario" onClick={() => setModal('oportunidad')}><Icono nombre="mas" tamano={14} /> Nueva oportunidad</button>
            <Menu opciones={[
              { texto: 'Editar', icono: 'lapiz', onClick: () => setModal('editar') },
              { texto: 'Eliminar', icono: 'papelera', onClick: eliminar, peligro: true, oculto: !esAdmin },
            ]} />
          </>
        }
      >
        <CifrasFicha cifras={[
          { etiqueta: 'Visitas atendidas', valor: visitas.length },
          { etiqueta: 'Última visita', valor: ultima ? formatDia(ultima) : '—' },
          { etiqueta: 'Gastado', valor: formatEUR(visitas.reduce((s, o) => s + Number(o.valor), 0)) },
          { etiqueta: 'Dueños', valor: a.empresa ? 'Empresa' : duenos.length },
        ]} />
      </CabeceraFicha>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Seccion titulo={`Historial de oportunidades (${a.oportunidad.length})`} sinPadding>
            <ListaOportunidades oportunidades={a.oportunidad} vacio="Aún no ha venido a la clínica" />
          </Seccion>
        </div>
        <div className="space-y-5">
          <Seccion titulo={a.empresa ? 'Empresa' : 'Dueños'}>
            {a.empresa ? (
              <Link href={`/empresas/${a.empresa.id_empresa}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-hover">
                <Avatar nombre={a.empresa.nombre} foto={a.empresa.logo} cuadrado tamano="md" />
                <span className="font-medium">{a.empresa.nombre}</span>
              </Link>
            ) : (
              <>
                {duenos.length === 0 && <p className="text-[13px] text-texto-3">Sin dueño asignado.</p>}
                <ul className="space-y-1">
                  {duenos.map((d) => (
                    <li key={d.id_particular} className="group flex items-center gap-3 rounded-lg p-2 hover:bg-hover">
                      <Avatar nombre={nombreCompleto(d)} tamano="md" />
                      <Link href={`/particulares/${d.id_particular}`} className="flex-1 font-medium hover:underline">{nombreCompleto(d)}</Link>
                      <button type="button" onClick={() => quitarDueno(d.id_particular, d.nombre)} aria-label={`Quitar a ${d.nombre}`} title="Quitar dueño"
                        className="rounded-md p-1.5 text-texto-3 opacity-0 group-hover:opacity-100 hover:text-rose-500 focus:opacity-100">
                        <Icono nombre="desvincular" tamano={15} />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2 border-t border-borde pt-3">
                  <select className="input" value={nuevoDueno} onChange={(e) => setNuevoDueno(e.target.value)} aria-label="Añadir dueño">
                    <option value="">Añadir otro dueño…</option>
                    {(datos?.personas ?? []).filter((x) => !duenos.some((d) => d.id_particular === x.id_particular)).map((x) => (
                      <option key={x.id_particular} value={x.id_particular}>{nombreCompleto(x)}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-secundario h-9" disabled={!nuevoDueno} onClick={anadirDueno}>Añadir</button>
                </div>
              </>
            )}
          </Seccion>
          <Seccion titulo="Datos">
            <dl>
              <Dato etiqueta="Especie">{especie}</Dato>
              <Dato etiqueta="Raza">{a.raza ?? '—'}</Dato>
              <Dato etiqueta="Sexo">{a.sexo ?? '—'}</Dato>
              <Dato etiqueta="Nacimiento">{a.fecha_nacimiento ? `${formatFecha(a.fecha_nacimiento)} (${edad(a.fecha_nacimiento)})` : '—'}</Dato>
              <Dato etiqueta="Microchip"><span className="font-mono text-[12.5px]">{a.microchip ?? '—'}</span></Dato>
              {a.notas && <Dato etiqueta="Notas"><span className="whitespace-pre-line">{a.notas}</span></Dato>}
            </dl>
          </Seccion>
        </div>
      </div>

      <FormAnimal abierto={modal === 'editar'} animal={a} onCerrar={() => setModal(null)} onGuardado={() => recargar()} />
      <FormOportunidad
        abierto={modal === 'oportunidad'}
        inicial={a.empresa ? { id_empresa_fk: a.empresa.id_empresa, id_animal_fk: a.id_animal } : { id_particular_fk: duenos[0]?.id_particular, id_animal_fk: a.id_animal }}
        onCerrar={() => setModal(null)}
        onGuardada={(idO) => router.push(`/oportunidades/${idO}`)}
      />
    </div>
  )
}
