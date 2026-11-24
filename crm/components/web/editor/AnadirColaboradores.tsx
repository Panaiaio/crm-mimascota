import { useMemo, useState } from 'react'
import { nombreCompleto } from '@/lib/utils'
import { motivoBloqueo, otrosDe, type RolColaborador } from '@/lib/web/seleccionColaboradores'
import Avatar from '@/components/ui/Avatar'
import BuscadorPastilla from '@/components/ui/BuscadorPastilla'
import Casilla from '@/components/ui/Casilla'
import SelectorRol from './SelectorRol'

type Candidato = { id_empleado: string; nombre: string; apellidos: string | null; foto: string | null; puesto: string }

const UMBRAL_BUSCADOR = 10

/** "Añadir personas": searchable list of employees, each with a checkbox and an Editor/Lector choice */
export default function AnadirColaboradores({
  candidatos,
  actuales,
  cambios,
  anadir,
  onAnadir,
}: {
  candidatos: Candidato[]
  actuales: { id_empleado: string; rol: RolColaborador }[]
  cambios: Record<string, RolColaborador>
  /** Ticked employees with their chosen role */
  anadir: Record<string, RolColaborador>
  onAnadir: (anadir: Record<string, RolColaborador>) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  // Role picked for a row, ticked or not; Lector by default
  const [elegidos, setElegidos] = useState<Record<string, RolColaborador>>({})
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return q ? candidatos.filter((c) => nombreCompleto(c).toLowerCase().includes(q)) : candidatos
  }, [candidatos, busqueda])

  function marcar(id: string, marcado: boolean) {
    const resto = { ...anadir }
    delete resto[id]
    onAnadir(marcado ? { ...resto, [id]: elegidos[id] ?? 'lector' } : resto)
  }
  function elegir(id: string, rol: RolColaborador) {
    setElegidos({ ...elegidos, [id]: rol })
    if (id in anadir) onAnadir({ ...anadir, [id]: rol })
  }

  return (
    <section aria-labelledby="titulo-anadir" className="border-t border-borde px-6 py-4">
      <h3 id="titulo-anadir" className="text-[14px] font-semibold text-texto">Añadir personas</h3>
      {candidatos.length > UMBRAL_BUSCADOR && <div className="mt-2"><BuscadorPastilla valor={busqueda} onChange={setBusqueda} ayuda="Nombre" /></div>}
      {visibles.length === 0 ? (
        <p className="mt-2 text-[13px] text-texto-3">{candidatos.length ? 'Nadie coincide con la búsqueda.' : 'No hay más empleados a los que dar acceso.'}</p>
      ) : (
        <ul className="mt-2 divide-y divide-borde">
          {visibles.map((c) => {
            const nombre = nombreCompleto(c)
            const marcado = c.id_empleado in anadir
            const rol = elegidos[c.id_empleado] ?? 'lector'
            const otros = otrosDe(actuales, cambios, anadir, c.id_empleado)
            // An unticked row that cannot be added at all says why; a ticked row can always stay
            const motivo = marcado ? null : motivoBloqueo(otros, 'lector', true)
            return (
              <li key={c.id_empleado} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                {motivo ? (
                  <span className="inline-block size-5 shrink-0 rounded-[4px] border border-borde bg-superficie-2" aria-hidden />
                ) : (
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <Casilla marcada={marcado} onChange={(v) => marcar(c.id_empleado, v)} etiqueta={`Añadir a ${nombre}`} />
                  </span>
                )}
                <Avatar nombre={nombre} foto={c.foto} tamano="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-texto">{nombre}</span>
                  <span className="block truncate text-[13px] text-texto-3">{c.puesto}</span>
                </span>
                {motivo ? (
                  <span className="text-[13px] text-texto-3">{motivo}</span>
                ) : (
                  <SelectorRol etiqueta={`Permiso de ${nombre}`} valor={rol} onChange={(r) => elegir(c.id_empleado, r)} otros={otros} nuevo />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
