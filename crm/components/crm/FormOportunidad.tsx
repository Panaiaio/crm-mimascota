'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ESTADOS, estadoInfo, MOTIVOS_DESCARTE, ORIGENES, SELECT_ANIMALES_DE_PARTICULAR, animalesDe, nombreConEspecie } from '@/lib/crm-utils'
import { errorLegible, nombreCompleto } from '@/lib/utils'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useAviso } from '@/hooks/useAviso'
import { useSesion } from '@/hooks/useSesion'
import type { AnimalBreve, Estado, Oportunidad, Origen, Particular } from '@/types'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm, resumenErrores, type Errores } from '@/components/ui/Campo'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import Pasos from '@/components/ui/Pasos'
import FormParticular from '@/components/crm/FormParticular'
import FormEmpresa from '@/components/crm/FormEmpresa'
import BarraProbabilidad from '@/components/ui/BarraProbabilidad'
import Icono from '@/components/ui/Icono'
import { cn } from '@/lib/utils'

type Inicial = Partial<Pick<Oportunidad, 'id_empresa_fk' | 'id_particular_fk' | 'id_animal_fk' | 'estado'>>

interface Formulario {
  titulo: string
  tipoCliente: 'particular' | 'empresa'
  id_particular_fk: string
  id_empresa_fk: string
  id_animal_fk: string
  servicio: string
  valor: string
  estado: Estado
  probabilidad: number
  id_responsable_fk: string
  origen: Origen
  fecha_cita: string
  hora_cita: string
  fecha_seguimiento: string
  motivo_descarte: string
  mensaje: string
}

/** Crear o editar una oportunidad */
export default function FormOportunidad({
  abierto,
  onCerrar,
  oportunidad,
  inicial,
  onGuardada,
}: {
  abierto: boolean
  onCerrar: () => void
  oportunidad?: Oportunidad | null
  inicial?: Inicial
  onGuardada: (id: string) => void
}) {
  const { empleados, servicios } = useCatalogos()
  const { empleado } = useSesion()
  const { aviso } = useAviso()
  const [f, setF] = useState<Formulario | null>(null)
  const [probTocada, setProbTocada] = useState(false)
  const [particulares, setParticulares] = useState<(Pick<Particular, 'id_particular' | 'nombre' | 'apellidos' | 'telefono'> & { animal_particular: { animal: AnimalBreve }[] })[]>([])
  const [empresas, setEmpresas] = useState<{ id_empresa: string; nombre: string; animal: AnimalBreve[] }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [paso, setPaso] = useState(0)
  const [creando, setCreando] = useState<{ tipo: 'particular' | 'empresa'; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  function cargarClientes() {
    const sb = createClient()
    sb.from('particular').select(`id_particular, nombre, apellidos, telefono, ${SELECT_ANIMALES_DE_PARTICULAR}`).order('nombre')
      .then(({ data }) => setParticulares((data ?? []) as never))
    sb.from('empresa').select('id_empresa, nombre, animal(id_animal, nombre, especie, raza)').order('nombre')
      .then(({ data }) => setEmpresas((data ?? []) as never))
  }

  // Rellenar el formulario al abrir
  useEffect(() => {
    if (!abierto) return
    const o = oportunidad
    setF({
      titulo: o?.titulo ?? '',
      tipoCliente: (o?.id_empresa_fk ?? inicial?.id_empresa_fk) ? 'empresa' : 'particular',
      id_particular_fk: o?.id_particular_fk ?? inicial?.id_particular_fk ?? '',
      id_empresa_fk: o?.id_empresa_fk ?? inicial?.id_empresa_fk ?? '',
      id_animal_fk: o?.id_animal_fk ?? inicial?.id_animal_fk ?? '',
      servicio: o?.servicio ?? '',
      valor: o ? String(o.valor ?? '') : '',
      estado: o?.estado ?? inicial?.estado ?? 'nuevo',
      probabilidad: o?.probabilidad ?? estadoInfo(inicial?.estado ?? 'nuevo').probabilidad,
      id_responsable_fk: o ? o.id_responsable_fk ?? '' : empleado?.id_empleado ?? '',
      origen: o?.origen ?? 'telefono',
      fecha_cita: o?.fecha_cita ?? '',
      hora_cita: o?.hora_cita?.slice(0, 5) ?? '',
      fecha_seguimiento: o?.fecha_seguimiento ?? '',
      motivo_descarte: o?.motivo_descarte ?? '',
      mensaje: o?.mensaje ?? '',
    })
    setProbTocada(!!o)
    setError(null)
    setErrores({})
    setPaso(0)
    cargarClientes()
    // Solo al abrir (inicial suele llegar como objeto nuevo en cada render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, oportunidad?.id_oportunidad, oportunidad?.fecha_actualizacion, JSON.stringify(inicial)])

  const animales = useMemo(() => {
    if (!f) return []
    if (f.tipoCliente === 'empresa') return empresas.find((e) => e.id_empresa === f.id_empresa_fk)?.animal ?? []
    const p = particulares.find((x) => x.id_particular === f.id_particular_fk)
    return p ? animalesDe(p) : []
  }, [f, particulares, empresas])

  if (!f) return null

  const poner = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setF((x) => (x ? { ...x, [campo]: valor } : x))
    if (errores[campo]) setErrores(({ [campo]: _, ...resto }) => resto)
  }

  const PASOS = ['Cliente', 'Oportunidad', 'Agenda']
  // Errores de cada paso, con lo que hay que hacer para arreglarlos
  function erroresDelPaso(i: number, x: Formulario): Errores {
    const e: Errores = {}
    if (i === 0) {
      if (x.tipoCliente === 'particular' && !x.id_particular_fk) e.id_particular_fk = 'Falta el particular. Búscalo por su nombre o créalo con «+ Crear particular».'
      if (x.tipoCliente === 'empresa' && !x.id_empresa_fk) e.id_empresa_fk = 'Falta la empresa. Búscala por su nombre o créala con «+ Crear empresa».'
    }
    if (i === 1) {
      if (x.estado === 'descartado' && !x.motivo_descarte) e.motivo_descarte = 'Falta el motivo. Elige por qué no sigue adelante.'
      if (Number(x.valor) < 0) e.valor = 'El valor no puede ser negativo. Escribe 0 si aún no lo sabes.'
    }
    if (i === 2) {
      if (x.estado === 'cita' && !x.fecha_cita) e.fecha_cita = 'Falta la fecha de la cita. Elige el día en el que vendrá el cliente (o cambia el estado en el paso 2).'
    }
    return e
  }
  const pasoHecho = (i: number) => !!f && Object.keys(erroresDelPaso(i, f)).length === 0 && (i < paso || !!oportunidad)

  function siguiente() {
    if (!f) return
    const e = erroresDelPaso(paso, f)
    setErrores(e)
    if (Object.keys(e).length) return setError(resumenErrores(e))
    setError(null)
    setPaso((p) => p + 1)
  }

  function cambiarEstado(estado: Estado) {
    setF((x) => x ? { ...x, estado, probabilidad: probTocada ? x.probabilidad : estadoInfo(estado).probabilidad } : x)
  }

  function cambiarServicio(nombre: string) {
    const s = servicios.find((x) => x.nombre === nombre)
    setF((x) => x ? { ...x, servicio: nombre, valor: !x.valor || Number(x.valor) === 0 ? String(s?.precio_base ?? '') : x.valor } : x)
  }

  async function guardar() {
    if (!f) return
    // Al crear, "Enter" en un paso intermedio pasa al siguiente
    if (!oportunidad && paso < PASOS.length - 1) return siguiente()
    // Se comprueban todos los pasos y se lleva al primero que tenga algo que corregir
    for (let i = 0; i < PASOS.length; i++) {
      const e = erroresDelPaso(i, f)
      if (Object.keys(e).length) { setPaso(i); setErrores(e); return setError(resumenErrores(e)) }
    }
    setErrores({})
    setGuardando(true)
    setError(null)
    const animal = animales.find((a) => a.id_animal === f.id_animal_fk)
    const datos = {
      titulo: f.titulo.trim() || [f.servicio || 'Consulta', animal?.nombre].filter(Boolean).join(' · '),
      id_particular_fk: f.tipoCliente === 'particular' ? f.id_particular_fk : null,
      id_empresa_fk: f.tipoCliente === 'empresa' ? f.id_empresa_fk : null,
      id_animal_fk: f.id_animal_fk || null,
      servicio: f.servicio || null,
      valor: Number(f.valor) || 0,
      estado: f.estado,
      probabilidad: f.probabilidad,
      id_responsable_fk: f.id_responsable_fk || null,
      origen: f.origen,
      fecha_cita: f.fecha_cita || null,
      hora_cita: f.hora_cita || null,
      fecha_seguimiento: f.fecha_seguimiento || null,
      motivo_descarte: f.estado === 'descartado' ? f.motivo_descarte : null,
      mensaje: f.mensaje.trim() || null,
    }
    try {
      const sb = createClient()
      const r = oportunidad
        ? await sb.from('oportunidad').update(datos).eq('id_oportunidad', oportunidad.id_oportunidad).select('id_oportunidad').single()
        : await sb.from('oportunidad').insert(datos).select('id_oportunidad').single()
      if (r.error) throw r.error
      aviso(oportunidad ? `Oportunidad «${datos.titulo}» guardada` : `Oportunidad «${datos.titulo}» creada`, 'exito', { ver: `/oportunidades/${r.data.id_oportunidad}` })
      onGuardada(r.data.id_oportunidad)
      onCerrar()
    } catch (e) {
      setError(errorLegible(e))
    } finally {
      setGuardando(false)
    }
  }

  const ultimo = paso === PASOS.length - 1
  const opcionesParticular = particulares.map((p) => ({ id: p.id_particular, texto: nombreCompleto(p), detalle: p.telefono ?? undefined }))
  const opcionesEmpresa = empresas.map((e) => ({ id: e.id_empresa, texto: e.nombre }))

  return (
    <>
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={oportunidad ? 'Editar oportunidad' : 'Nueva oportunidad'}
      subtitulo={oportunidad ? undefined : 'Una consulta, un presupuesto o un servicio que puede acabar en venta.'}
      onSubmit={guardar}
      ancho="md"
      pie={
        <>
          <ErrorForm mensaje={error} />
          <button type="button" className="btn-fantasma" onClick={onCerrar}>Cancelar</button>
          {paso > 0 && <button type="button" className="btn-secundario" onClick={() => { setError(null); setErrores({}); setPaso((p) => p - 1) }}><Icono nombre="izquierda" tamano={14} /> Anterior</button>}
          {!oportunidad && !ultimo ? (
            <button key="siguiente" type="button" className="btn-primario" onClick={siguiente}>Siguiente <Icono nombre="derecha" tamano={14} /></button>
          ) : (
            <button key="guardar" type="submit" className="btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : oportunidad ? 'Guardar cambios' : 'Crear oportunidad'}
            </button>
          )}
        </>
      }
    >
      <Pasos pasos={PASOS} actual={paso} hechos={PASOS.map((_, i) => pasoHecho(i))}
        onIr={(i) => { if (oportunidad || i < paso) { setError(null); setErrores({}); setPaso(i) } }} />

      {paso === 0 && (
        <div className="seccion-form space-y-6">
          <div>
            <span className="label">Tipo de cliente</span>
            <div role="radiogroup" aria-label="Tipo de cliente" className="inline-flex rounded-lg border border-borde bg-superficie-2">
              {(['particular', 'empresa'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={f.tipoCliente === t}
                  onClick={() => setF((x) => x ? { ...x, tipoCliente: t, id_animal_fk: '' } : x)}
                  className={cn('h-11 rounded-lg px-4 text-[14px]', f.tipoCliente === t ? 'bg-superficie font-medium text-texto shadow-sm ring-1 ring-borde' : 'text-texto-3 hover:text-texto')}
                >
                  {t === 'particular' ? 'Particular' : 'Empresa'}
                </button>
              ))}
            </div>
          </div>
          {f.tipoCliente === 'particular' ? (
            <Campo etiqueta="Particular" obligatorio nombre="id_particular_fk" error={errores.id_particular_fk} ayuda="Escribe su nombre o su teléfono.">
              <SelectorBuscable valor={f.id_particular_fk} opciones={opcionesParticular} invalido={!!errores.id_particular_fk}
                onChange={(id) => { setF((x) => x ? { ...x, id_particular_fk: id, id_animal_fk: '' } : x); if (id) setErrores(({ id_particular_fk: _, ...r }) => r) }}
                ayuda="Buscar particular…" textoCrear="Crear particular" onCrear={(texto) => setCreando({ tipo: 'particular', texto })} />
            </Campo>
          ) : (
            <Campo etiqueta="Empresa" obligatorio nombre="id_empresa_fk" error={errores.id_empresa_fk}>
              <SelectorBuscable valor={f.id_empresa_fk} opciones={opcionesEmpresa} invalido={!!errores.id_empresa_fk}
                onChange={(id) => { setF((x) => x ? { ...x, id_empresa_fk: id, id_animal_fk: '' } : x); if (id) setErrores(({ id_empresa_fk: _, ...r }) => r) }}
                ayuda="Buscar empresa…" textoCrear="Crear empresa" onCrear={(texto) => setCreando({ tipo: 'empresa', texto })} />
            </Campo>
          )}
          <Campo etiqueta="Animal" ayuda={(f.id_particular_fk || f.id_empresa_fk) && !animales.length ? 'Este cliente no tiene animales registrados.' : 'Opcional. Si es para un animal concreto.'}>
            <select className="input" value={f.id_animal_fk} onChange={(e) => poner('id_animal_fk', e.target.value)} disabled={!animales.length}>
              <option value="">{animales.length ? 'Ninguno en concreto' : '—'}</option>
              {animales.map((a) => <option key={a.id_animal} value={a.id_animal}>{nombreConEspecie(a)}</option>)}
            </select>
          </Campo>
        </div>
      )}

      {paso === 1 && (
        <div className="seccion-form space-y-6">
          <div>
            <span className="label">{oportunidad ? 'Estado (elige otro para moverla)' : 'Estado'}</span>
            <div role="radiogroup" aria-label="Estado" className="grid grid-cols-2 gap-2 rounded-lg border border-borde bg-superficie-2 p-2 sm:grid-cols-3">
              {ESTADOS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  role="radio"
                  aria-checked={f.estado === e.id}
                  title={e.ayuda}
                  onClick={() => cambiarEstado(e.id)}
                  className={cn(
                    'h-11 truncate rounded-lg px-2 text-[14px] transition-colors',
                    f.estado === e.id
                      ? e.tono === 'verde' ? 'bg-emerald-700 font-medium text-white shadow-sm' : e.tono === 'rojo' ? 'bg-rose-700 font-medium text-white shadow-sm' : 'bg-superficie font-medium text-texto shadow-sm ring-1 ring-borde'
                      : 'text-texto-2 hover:text-texto',
                  )}
                >
                  {e.texto}
                </button>
              ))}
            </div>
          </div>
          {f.estado === 'descartado' && (
            <Campo etiqueta="Motivo del descarte" obligatorio nombre="motivo_descarte" error={errores.motivo_descarte}>
              <select className="input" value={f.motivo_descarte} onChange={(e) => poner('motivo_descarte', e.target.value)} aria-invalid={!!errores.motivo_descarte || undefined}>
                <option value="">Elige…</option>
                {MOTIVOS_DESCARTE.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Campo>
          )}
          <Campo etiqueta="Servicio" ayuda="Al elegirlo se rellena el valor con su precio.">
            <select className="input" value={f.servicio} onChange={(e) => cambiarServicio(e.target.value)}>
              <option value="">Sin indicar</option>
              {servicios.map((s) => <option key={s.id_servicio} value={s.nombre}>{s.nombre}</option>)}
              {f.servicio && !servicios.some((s) => s.nombre === f.servicio) && <option value={f.servicio}>{f.servicio}</option>}
            </select>
          </Campo>
          <Campo etiqueta="Valor (€)" nombre="valor" error={errores.valor}>
            <input className="input" type="number" min={0} step="0.01" value={f.valor} onChange={(e) => poner('valor', e.target.value)} placeholder="0" />
          </Campo>
          <Campo etiqueta="Título" ayuda="Si lo dejas vacío se pone el servicio y el animal, por ejemplo «Vacunación · Kiko».">
            <input className="input" value={f.titulo} onChange={(e) => poner('titulo', e.target.value)} />
          </Campo>
          <Campo etiqueta="Responsable">
            <select className="input" value={f.id_responsable_fk} onChange={(e) => poner('id_responsable_fk', e.target.value)}>
              <option value="">Sin asignar</option>
              {empleados.map((e) => <option key={e.id_empleado} value={e.id_empleado}>{nombreCompleto(e)}</option>)}
            </select>
          </Campo>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label !mb-0">Probabilidad de que salga adelante</span>
              <span className="text-[14px] font-medium tabular-nums">{f.probabilidad} %</span>
            </div>
            <input
              type="range" min={0} max={100} step={5} value={f.probabilidad}
              onChange={(e) => { setProbTocada(true); poner('probabilidad', Number(e.target.value)) }}
              className="h-11 w-full accent-[var(--texto)]"
              aria-label="Probabilidad"
            />
            <BarraProbabilidad valor={f.probabilidad} segmentos={40} mostrarValor={false} grande className="mt-2 [&>div]:w-full [&>div>span]:flex-1" />
            <span className="mt-2 block text-[12.5px] text-texto-3">Se calcula según el estado; muévela solo si lo sabes mejor.</span>
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="seccion-form space-y-6">
          <Campo etiqueta="Fecha de la cita" obligatorio={f.estado === 'cita'} nombre="fecha_cita" error={errores.fecha_cita}>
            <input className="input" type="date" value={f.fecha_cita} onChange={(e) => poner('fecha_cita', e.target.value)} aria-invalid={!!errores.fecha_cita || undefined} />
          </Campo>
          <Campo etiqueta="Hora de la cita">
            <input className="input" type="time" value={f.hora_cita} onChange={(e) => poner('hora_cita', e.target.value)} />
          </Campo>
          <Campo etiqueta="Próximo seguimiento" ayuda="Día en el que hay que volver a llamar o escribir al cliente.">
            <input className="input" type="date" value={f.fecha_seguimiento} onChange={(e) => poner('fecha_seguimiento', e.target.value)} />
          </Campo>
          <Campo etiqueta="Origen" ayuda="Cómo ha llegado el cliente.">
            <select className="input" value={f.origen} onChange={(e) => poner('origen', e.target.value as Origen)}>
              {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Mensaje o notas" ayuda="Lo que ha pedido el cliente.">
            <textarea className="input" rows={3} value={f.mensaje} onChange={(e) => poner('mensaje', e.target.value)} />
          </Campo>
        </div>
      )}
    </Modal>

    {/* Crear el cliente sin salir de la oportunidad */}
    <FormParticular abierto={creando?.tipo === 'particular'} nombreInicial={creando?.texto} onCerrar={() => setCreando(null)}
      onGuardado={(id) => { cargarClientes(); setF((x) => x ? { ...x, id_particular_fk: id, id_animal_fk: '' } : x); setErrores({}); setError(null) }} />
    <FormEmpresa abierto={creando?.tipo === 'empresa'} nombreInicial={creando?.texto} onCerrar={() => setCreando(null)}
      onGuardada={(id) => { cargarClientes(); setF((x) => x ? { ...x, id_empresa_fk: id, id_animal_fk: '' } : x); setErrores({}); setError(null) }} />
    </>
  )
}
