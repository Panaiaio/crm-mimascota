'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deVacacionesHoy, formatDuracion, lunesDeEstaSemana, minutosFichaje } from '@/lib/rrhh-utils'
import { aISO, errorLegible, formatHora, hoyISO, nombreCompleto, sumarDias } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Empleado, Fichaje, Vacacion } from '@/types'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import Seccion, { Cifra } from '@/components/ui/Seccion'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm } from '@/components/ui/Campo'
import Vacio from '@/components/ui/Vacio'
import { ErrorCarga, BloqueCargando } from '@/components/ui/Cargando'
import BotonFichar from '@/components/rrhh/BotonFichar'
import ListaFichajes from '@/components/rrhh/ListaFichajes'

/** Pasa un timestamp a "AAAA-MM-DDTHH:MM" para un <input type="datetime-local"> */
const aLocal = (v: string | null) => {
  if (!v) return ''
  const d = new Date(v)
  return `${aISO(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function FichajesPage() {
  const { empleado, esAdmin } = useSesion()
  const { empleados } = useCatalogos()
  const { aviso } = useAviso()
  const [pestana, setPestana] = useState(esAdmin ? 'equipo' : 'mios')
  const [periodo, setPeriodo] = useState('7')
  const [quien, setQuien] = useState('todos')
  const [corrigiendo, setCorrigiendo] = useState<Fichaje | null>(null)
  const [entrada, setEntrada] = useState('')
  const [salida, setSalida] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)

  useTituloPagina({ titulo: 'Fichajes' })

  const desde = periodo === 'semana' ? lunesDeEstaSemana() : sumarDias(hoyISO(), -Number(periodo) + 1)
  const { datos, cargando, error, recargar } = useConsulta(async (sb) => {
    const f = sinError(await sb.from('fichaje').select('*, empleado(id_empleado, nombre, apellidos, foto)')
      .gte('entrada', new Date(desde + 'T00:00:00').toISOString()).order('entrada', { ascending: false })) as Fichaje[]
    const equipo = esAdmin ? (sinError(await sb.from('empleado').select('*, vacacion!id_empleado_fk(estado, fecha_inicio, fecha_fin)').eq('activo', true).order('nombre')) as (Empleado & { vacacion: Vacacion[] })[]) : []
    return { f, equipo }
  }, [desde, esAdmin])

  const mios = useMemo(() => (datos?.f ?? []).filter((f) => f.id_empleado_fk === empleado?.id_empleado), [datos, empleado])
  const delEquipo = useMemo(() => (datos?.f ?? []).filter((f) => quien === 'todos' || f.id_empleado_fk === quien), [datos, quien])
  const hoy = hoyISO()

  // Estado de hoy de cada trabajador
  const estadoHoy = useMemo(() => (datos?.equipo ?? []).map((e) => {
    const deHoy = (datos?.f ?? []).filter((f) => f.id_empleado_fk === e.id_empleado && aISO(new Date(f.entrada)) === hoy)
    const abierto = deHoy.find((f) => !f.salida)
    const minutos = deHoy.reduce((s, f) => s + minutosFichaje(f), 0)
    const estado = deVacacionesHoy(e.vacacion) ? { texto: 'De vacaciones', tono: 'amarillo' as const }
      : abierto ? { texto: `Trabajando desde las ${formatHora(abierto.entrada)}`, tono: 'verde' as const }
      : deHoy.length ? { texto: `Ha salido a las ${formatHora(deHoy[0].salida)}`, tono: 'gris' as const }
      : { texto: 'Sin fichar', tono: 'rojo' as const }
    return { e, estado, minutos }
  }), [datos, hoy])

  function abrirCorreccion(f: Fichaje) {
    setCorrigiendo(f)
    setEntrada(aLocal(f.entrada))
    setSalida(aLocal(f.salida))
    setErrorForm(null)
  }

  async function guardarCorreccion() {
    if (!corrigiendo) return
    if (salida && salida <= entrada) return setErrorForm('La salida tiene que ser después de la entrada')
    const { error: err } = await createClient().from('fichaje').update({
      entrada: new Date(entrada).toISOString(), salida: salida ? new Date(salida).toISOString() : null,
    }).eq('id_fichaje', corrigiendo.id_fichaje)
    if (err) return setErrorForm(errorLegible(err))
    aviso('Fichaje corregido')
    setCorrigiendo(null)
    recargar()
  }

  const minMios = mios.reduce((s, f) => s + minutosFichaje(f), 0)
  const diasMios = new Set(mios.map((f) => aISO(new Date(f.entrada)))).size

  return (
    <div className="flex h-full flex-col">
      {esAdmin && (
        <Pestanas activa={pestana} onCambiar={setPestana} pestanas={[
          { id: 'equipo', texto: 'Todo el equipo' },
          { id: 'mios', texto: 'Mis fichajes' },
        ]} />
      )}
      <BarraFiltros filtros={
        <>
          <FiltroPastilla etiqueta="Periodo" valor={periodo} onChange={setPeriodo} opciones={[
            { valor: '1', texto: 'Hoy' }, { valor: 'semana', texto: 'Esta semana' }, { valor: '7', texto: '7 días' }, { valor: '30', texto: '30 días' }, { valor: '90', texto: '90 días' },
          ]} />
          {pestana === 'equipo' && (
            <FiltroPastilla etiqueta="Empleado" valor={quien} onChange={setQuien} opciones={[{ valor: 'todos', texto: 'Todos' }, ...empleados.map((e) => ({ valor: e.id_empleado, texto: nombreCompleto(e) }))]} />
          )}
        </>
      } />

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-10 sm:px-6">
        {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : cargando && !datos ? <BloqueCargando alto={300} /> : pestana === 'mios' ? (
          <>
            {empleado ? <BotonFichar onFichado={recargar} /> : <Vacio icono="candado" titulo="Tu usuario no tiene ficha de empleado" texto="Pide a un administrador que la cree con tu correo para poder fichar." />}
            <div className="grid gap-4 sm:grid-cols-3">
              <Cifra etiqueta="Horas en el periodo" valor={formatDuracion(minMios)} />
              <Cifra etiqueta="Días trabajados" valor={diasMios} />
              <Cifra etiqueta="Media por día" valor={diasMios ? formatDuracion(Math.round(minMios / diasMios)) : '—'} />
            </div>
            <Seccion titulo="Mis fichajes" sinPadding><ListaFichajes fichajes={mios} /></Seccion>
          </>
        ) : (
          <>
            <Seccion titulo={`Hoy · ${estadoHoy.filter((x) => x.estado.tono === 'verde').length} de ${estadoHoy.length} trabajando`} sinPadding>
              <ul className="grid divide-borde-suave sm:grid-cols-2 xl:grid-cols-3">
                {estadoHoy.map(({ e, estado, minutos }) => (
                  <li key={e.id_empleado} className="flex items-center gap-3 border-b border-borde-suave px-5 py-3">
                    <Avatar nombre={nombreCompleto(e)} foto={e.foto} tamano="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{nombreCompleto(e)}</p>
                      <Etiqueta punto tono={estado.tono} className="mt-1">{estado.texto}</Etiqueta>
                    </div>
                    <span className="text-[12.5px] text-texto-3 tabular-nums">{minutos ? formatDuracion(minutos) : ''}</span>
                  </li>
                ))}
              </ul>
            </Seccion>
            <Seccion titulo="Registro de fichajes" sinPadding>
              <ListaFichajes fichajes={delEquipo} conEmpleado onEditar={abrirCorreccion} />
            </Seccion>
          </>
        )}
      </div>

      <Modal abierto={!!corrigiendo} onCerrar={() => setCorrigiendo(null)} titulo="Corregir fichaje" subtitulo={corrigiendo?.empleado ? nombreCompleto(corrigiendo.empleado) : ''} ancho="sm" onSubmit={guardarCorreccion}
        pie={<><ErrorForm mensaje={errorForm} /><button type="button" className="btn-secundario" onClick={() => setCorrigiendo(null)}>Cancelar</button><button type="submit" className="btn-primario">Guardar</button></>}>
        <div className="grid gap-4 px-6 py-5">
          <Campo etiqueta="Entrada"><input className="input" type="datetime-local" value={entrada} onChange={(e) => setEntrada(e.target.value)} required /></Campo>
          <Campo etiqueta="Salida" ayuda="Déjala vacía si sigue trabajando."><input className="input" type="datetime-local" value={salida} onChange={(e) => setSalida(e.target.value)} /></Campo>
        </div>
      </Modal>
    </div>
  )
}
