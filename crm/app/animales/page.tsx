'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SELECT_DUENOS, duenosDe, tonoDeTexto } from '@/lib/crm-utils'
import { descargarCSV, edad, errorLegible, formatDia, nombreCompleto, normalizar } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Animal, AnimalBase, Oportunidad } from '@/types'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import PieTabla from '@/components/ui/PieTabla'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, FilasCargando } from '@/components/ui/Cargando'
import FormAnimal from '@/components/crm/FormAnimal'

type Fila = Omit<Animal, 'oportunidad'> & { oportunidad: Pick<Oportunidad, 'estado' | 'fecha_cita' | 'fecha_creacion'>[] }

export default function AnimalesPage() {
  const router = useRouter()
  const { esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [pestana, setPestana] = useState('todos')
  const [especie, setEspecie] = useState('todas')
  const [orden, setOrden] = useState('nombre')
  const [texto, setTexto] = useState('')
  const [editando, setEditando] = useState<AnimalBase | null | undefined>(undefined)

  const { datos, cargando, error, recargar } = useConsulta(async (sb) =>
    sinError(await sb.from('animal').select(`*, empresa(id_empresa, nombre, logo), ${SELECT_DUENOS}, oportunidad(estado, fecha_cita, fecha_creacion)`).order('nombre')) as Fila[],
  )

  const filas = useMemo(() => (datos ?? []).map((a) => {
    const visitas = a.oportunidad.filter((o) => o.estado === 'atendido').map((o) => o.fecha_cita ?? o.fecha_creacion).sort()
    return { ...a, duenos: duenosDe(a), ultimaVisita: visitas.at(-1) ?? null }
  }), [datos])

  const especies = useMemo(() => {
    const cuenta = new Map<string, number>()
    filas.forEach((f) => cuenta.set(f.especie, (cuenta.get(f.especie) ?? 0) + 1))
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
  }, [filas])

  const visibles = useMemo(() => {
    const q = normalizar(texto)
    const r = filas.filter((f) =>
      (pestana === 'todos' || (pestana === 'empresa' ? !!f.id_empresa_fk : !f.id_empresa_fk)) &&
      (especie === 'todas' || f.especie === especie) &&
      (!q || normalizar(`${f.nombre} ${f.raza} ${f.microchip} ${f.empresa?.nombre ?? ''} ${f.duenos.map((d) => nombreCompleto(d)).join(' ')}`).includes(q)),
    )
    const cmp: Record<string, (a: typeof r[0], b: typeof r[0]) => number> = {
      nombre: (a, b) => a.nombre.localeCompare(b.nombre),
      visita: (a, b) => (b.ultimaVisita ?? '').localeCompare(a.ultimaVisita ?? ''),
      edad: (a, b) => (a.fecha_nacimiento ?? '9').localeCompare(b.fecha_nacimiento ?? '9'),
    }
    return [...r].sort(cmp[orden])
  }, [filas, pestana, especie, texto, orden])

  useTituloPagina({ titulo: 'Animales', insignia: <Etiqueta punto tono="verde">{especies.length} especies</Etiqueta> }, [especies.length])

  async function eliminar(f: Fila) {
    const ok = await confirmar({ titulo: `¿Eliminar a ${f.nombre}?`, texto: 'Sus oportunidades se conservan sin animal.', boton: 'Eliminar', peligro: true })
    if (!ok) return
    const { error: err } = await createClient().from('animal').delete().eq('id_animal', f.id_animal)
    if (err) return aviso(errorLegible(err), 'error')
    aviso('Animal eliminado')
    recargar()
  }

  return (
    <div className="flex h-full flex-col">
      <Pestanas activa={pestana} onCambiar={setPestana} pestanas={[
        { id: 'todos', texto: 'Todos', contador: filas.length },
        { id: 'particular', texto: 'De particulares', contador: filas.filter((f) => !f.id_empresa_fk).length },
        { id: 'empresa', texto: 'De empresas', contador: filas.filter((f) => f.id_empresa_fk).length },
      ]} />
      <BarraFiltros
        filtros={
          <>
            <FiltroPastilla etiqueta="Ordenar" valor={orden} onChange={setOrden} opciones={[{ valor: 'nombre', texto: 'Nombre' }, { valor: 'visita', texto: 'Última visita' }, { valor: 'edad', texto: 'Edad' }]} />
            <FiltroPastilla etiqueta="Especie" valor={especie} onChange={setEspecie} opciones={[{ valor: 'todas', texto: 'Todas' }, ...especies.map(([e, n]) => ({ valor: e, texto: `${e[0].toUpperCase()}${e.slice(1)} (${n})` }))]} />
            <label className="pastilla w-48 items-center gap-2 px-2.5">
              <Icono nombre="buscar" tamano={14} className="shrink-0 text-texto-3" />
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre, dueño, chip…" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-texto-3" />
            </label>
          </>
        }
        acciones={
          <>
            <button type="button" className="btn-secundario" onClick={() => descargarCSV('animales', visibles.map((f) => ({
              Nombre: f.nombre, Especie: f.especie, Raza: f.raza ?? '', Sexo: f.sexo ?? '', Edad: edad(f.fecha_nacimiento), Microchip: f.microchip ?? '',
              Dueno: f.empresa?.nombre ?? f.duenos.map((d) => nombreCompleto(d)).join(', '),
            })))}><Icono nombre="exportar" tamano={14} /> Exportar</button>
            <button type="button" className="btn-primario" onClick={() => setEditando(null)}><Icono nombre="mas" tamano={14} /> Nuevo animal</button>
          </>
        }
      />
      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : (
        <div className="min-h-0 flex-1 overflow-auto border-t border-borde">
          <table className="tabla min-w-[980px]">
            <thead>
              <tr>
                <th className="!pl-4 sm:!pl-6">Animal</th>
                <th>Especie</th>
                <th>Dueño</th>
                <th>Edad</th>
                <th>Sexo</th>
                <th>Microchip</th>
                <th>Última visita</th>
                <th className="w-14 text-center">Acción</th>
              </tr>
            </thead>
            {cargando && !datos ? <FilasCargando columnas={8} /> : (
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id_animal} className="cursor-pointer" onClick={() => router.push(`/animales/${f.id_animal}`)}>
                    <td className="!pl-4 sm:!pl-6">
                      <div className="flex items-center gap-2.5">
                        <Avatar nombre={f.nombre} foto={f.foto} tamano="md" />
                        <div className="leading-tight">
                          <p className="font-medium text-texto">{f.nombre}</p>
                          <p className="text-[12.5px] text-texto-3">{f.raza ?? 'Raza sin indicar'}</p>
                        </div>
                      </div>
                    </td>
                    <td><Etiqueta tono={tonoDeTexto(f.especie)}>{f.especie[0].toUpperCase() + f.especie.slice(1)}</Etiqueta></td>
                    <td>
                      {f.empresa ? (
                        <span className="flex items-center gap-2"><Avatar nombre={f.empresa.nombre} foto={f.empresa.logo} cuadrado tamano="xs" />{f.empresa.nombre}</span>
                      ) : f.duenos.length ? (
                        <span className="flex items-center gap-2">
                          <span className="flex -space-x-1.5">{f.duenos.map((d) => <Avatar key={d.id_particular} nombre={nombreCompleto(d)} tamano="xs" className="ring-2 ring-fondo" />)}</span>
                          {f.duenos.map((d) => d.nombre).join(' y ')}
                        </span>
                      ) : <span className="text-texto-3">Sin dueño</span>}
                    </td>
                    <td className="text-texto-2">{edad(f.fecha_nacimiento)}</td>
                    <td className="text-texto-2">{f.sexo ? f.sexo[0].toUpperCase() + f.sexo.slice(1) : '—'}</td>
                    <td className="font-mono text-[12.5px] text-texto-3">{f.microchip ?? '—'}</td>
                    <td>{f.ultimaVisita ? formatDia(f.ultimaVisita) : <span className="text-texto-3">—</span>}</td>
                    <td className="text-center">
                      <Menu opciones={[
                        { texto: 'Ver ficha', icono: 'ojo', href: `/animales/${f.id_animal}` },
                        { texto: 'Editar', icono: 'lapiz', onClick: () => setEditando(f) },
                        { texto: 'Eliminar', icono: 'papelera', onClick: () => eliminar(f), peligro: true, oculto: !esAdmin },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {!cargando && visibles.length === 0 && <Vacio icono="animal" titulo="Ningún animal con estos filtros" />}
        </div>
      )}
      <PieTabla items={[
        { valor: visibles.length, etiqueta: visibles.length === 1 ? 'animal en vista' : 'animales en vista' },
        { valor: visibles.filter((f) => f.id_empresa_fk).length, etiqueta: 'de empresas' },
        { valor: visibles.filter((f) => f.duenos.length > 1).length, etiqueta: 'con varios dueños' },
      ]} />
      <FormAnimal abierto={editando !== undefined} animal={editando} onCerrar={() => setEditando(undefined)} onGuardado={(id) => (editando ? recargar() : router.push(`/animales/${id}`))} />
    </div>
  )
}
