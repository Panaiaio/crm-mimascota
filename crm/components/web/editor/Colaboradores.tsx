'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { errorLegible, nombreCompleto } from '@/lib/utils'
import { guardarColaborador, listarColaboradores, quitarColaborador } from '@/lib/web/datos'
import { limites, MAX_EDITORES, MAX_PERSONAS } from '@/lib/web/limites'
import { otrosDe, type RolColaborador } from '@/lib/web/seleccionColaboradores'
import type { RolWeb } from '@/lib/web/tipos'
import { useAviso } from '@/hooks/useAviso'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useSesion } from '@/hooks/useSesion'
import Avatar from '@/components/ui/Avatar'
import Modal from '@/components/ui/Modal'
import AnadirColaboradores from './AnadirColaboradores'
import CambiarDueno from './CambiarDueno'
import SelectorRol from './SelectorRol'

type Colaborador = { id_empleado: string; nombre: string; rol: RolColaborador }

/**
 * "Ver colaboradores": everyone sees who is in the site; the owner and admins manage it,
 * admins can also change the owner. Reloads the list each time it opens and after every change.
 */
export default function Colaboradores({
  abierto,
  onCerrar,
  web,
  rol,
  onCambioDueno,
}: {
  abierto: boolean
  onCerrar: () => void
  web: { id_web: string; nombre: string; id_dueno_fk: string }
  rol: RolWeb
  /** The owner was changed: the editor updates its copy of the site */
  onCambioDueno: (idNuevo: string) => void
}) {
  const { aviso, confirmar } = useAviso()
  const { esAdmin } = useSesion()
  const { empleados } = useCatalogos()
  const [lista, setLista] = useState<Colaborador[] | null>(null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  // Pending changes, applied by "Guardar cambios"
  const [cambios, setCambios] = useState<Record<string, RolColaborador>>({})
  const [anadir, setAnadir] = useState<Record<string, RolColaborador>>({})
  const [guardando, setGuardando] = useState(false)
  const gestiona = rol === 'dueno' || rol === 'admin'

  const recargar = useCallback(async () => {
    try {
      setLista(await listarColaboradores(web.id_web))
      setErrorCarga(null)
    } catch (e) {
      setErrorCarga(errorLegible(e))
    }
  }, [web.id_web])

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    listarColaboradores(web.id_web)
      .then((l) => vigente && (setLista(l), setErrorCarga(null)))
      .catch((e) => vigente && setErrorCarga(errorLegible(e)))
    return () => { vigente = false }
  }, [abierto, web.id_web])

  // Closing drops the pending changes and the list, so the next opening starts clean
  function cerrar() {
    setCambios({})
    setAnadir({})
    setLista(null)
    onCerrar()
  }

  const dueno = empleados.find((e) => e.id_empleado === web.id_dueno_fk)
  const nombreDueno = nombreCompleto(dueno) || 'Dueño'
  const { editores, personas } = limites(lista ?? [])
  const enLista = useMemo(() => new Set((lista ?? []).map((c) => c.id_empleado)), [lista])
  const candidatos = empleados.filter((e) => e.rol !== 'admin' && e.id_empleado !== web.id_dueno_fk && !enLista.has(e.id_empleado))
  const hayCambios = Object.keys(anadir).length > 0 || Object.keys(cambios).some((id) => cambios[id] !== lista?.find((c) => c.id_empleado === id)?.rol)

  async function quitar(c: Colaborador) {
    const ok = await confirmar({
      titulo: `Quitar a ${c.nombre} de «${web.nombre.trim() || 'Web sin nombre'}»`,
      texto: `${c.nombre} dejará de ver y editar esta web. Podrás volver a añadirle cuando quieras.`,
      boton: 'Quitar de la web',
    })
    if (!ok) return
    try {
      await quitarColaborador(web.id_web, c.id_empleado)
      aviso(`${c.nombre} ya no tiene acceso a la web.`)
      setCambios((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== c.id_empleado)))
    } catch (e) {
      aviso(`${c.nombre}: ${errorLegible(e)}`, 'error')
    }
    await recargar()
  }

  async function guardar() {
    const nombres = new Map([...(lista ?? []).map((c) => [c.id_empleado, c.nombre] as const), ...empleados.map((e) => [e.id_empleado, nombreCompleto(e)] as const)])
    const cambiados = Object.entries(cambios).filter(([id, r]) => r !== lista?.find((c) => c.id_empleado === id)?.rol)
    // Readers first: they free editor places for the editors that come after
    const pasos = [...cambiados, ...Object.entries(anadir)].sort(([, a], [, b]) => (a === b ? 0 : a === 'lector' ? -1 : 1))
    setGuardando(true)
    let fallos = 0
    for (const [id, r] of pasos) {
      try {
        await guardarColaborador(web.id_web, id, r)
      } catch (e) {
        fallos++
        aviso(`${nombres.get(id) ?? 'Persona'}: ${errorLegible(e)}`, 'error')
      }
    }
    if (fallos < pasos.length) aviso(fallos ? 'Se han guardado el resto de cambios.' : 'Cambios guardados.')
    setCambios({})
    setAnadir({})
    await recargar()
    setGuardando(false)
  }

  const actuales = lista ?? []
  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Colaboradores"
      subtitulo={`Editores ${editores}/${MAX_EDITORES} · Personas ${personas}/${MAX_PERSONAS}`}
      ancho="lg"
      onSubmit={gestiona ? () => void guardar() : undefined}
      pie={gestiona
        ? (
          <>
            <button type="button" className="btn-secundario" onClick={cerrar}>Cerrar</button>
            <button type="submit" className="btn-primario" disabled={!hayCambios || guardando}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
          </>
        )
        : <button type="button" className="btn-secundario" onClick={cerrar}>Cerrar</button>}
    >
      <div className="px-6 py-4">
        {errorCarga ? (
          <p role="alert" className="text-[14px] text-rose-700 dark:text-rose-400">
            {errorCarga} <button type="button" className="underline" onClick={() => void recargar()}>Reintentar</button>
          </p>
        ) : !lista ? (
          <p role="status" className="text-[14px] text-texto-3">Cargando…</p>
        ) : (
          <ul className="divide-y divide-borde">
            <li className="flex min-h-11 items-center gap-3 py-2">
              <Avatar nombre={nombreDueno} foto={dueno?.foto} tamano="md" />
              <span className="min-w-0 flex-1 truncate text-[14px] text-texto">{nombreDueno}</span>
              <span className="text-[13px] font-medium text-texto-2">Dueño</span>
            </li>
            {actuales.map((c) => {
              const valor = cambios[c.id_empleado] ?? c.rol
              return (
                <li key={c.id_empleado} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                  <Avatar nombre={c.nombre} foto={empleados.find((e) => e.id_empleado === c.id_empleado)?.foto} tamano="md" />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-texto">{c.nombre}</span>
                  {gestiona ? (
                    <>
                      <SelectorRol
                        etiqueta={`Permiso de ${c.nombre}`}
                        valor={valor}
                        onChange={(r) => setCambios({ ...cambios, [c.id_empleado]: r })}
                        otros={otrosDe(actuales, cambios, anadir, c.id_empleado)}
                        nuevo={false}
                      />
                      <button type="button" className="btn-fantasma" onClick={() => void quitar(c)} aria-label={`Quitar a ${c.nombre}`}>Quitar</button>
                    </>
                  ) : (
                    <span className="text-[13px] text-texto-2">{c.rol === 'editor' ? 'Editor' : 'Lector'}</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {gestiona && lista && (
        <AnadirColaboradores candidatos={candidatos} actuales={actuales} cambios={cambios} anadir={anadir} onAnadir={setAnadir} />
      )}
      {esAdmin && (
        <CambiarDueno
          idWeb={web.id_web}
          empleados={empleados}
          duenoActual={web.id_dueno_fk}
          nombreDueno={dueno ? nombreDueno : ''}
          onCambiado={(id) => { cerrar(); onCambioDueno(id) }}
        />
      )}
    </Modal>
  )
}
