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
import Campo, { ErrorForm } from '@/components/ui/Campo'
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
  const [particulares, setParticulares] = useState<(Pick<Particular, 'id_particular' | 'nombre' | 'apellidos'> & { animal_particular: { animal: AnimalBreve }[] })[]>([])
  const [empresas, setEmpresas] = useState<{ id_empresa: string; nombre: string; animal: AnimalBreve[] }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

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
    const sb = createClient()
    sb.from('particular').select(`id_particular, nombre, apellidos, ${SELECT_ANIMALES_DE_PARTICULAR}`).order('nombre')
      .then(({ data }) => setParticulares((data ?? []) as never))
    sb.from('empresa').select('id_empresa, nombre, animal(id_animal, nombre, especie, raza)').order('nombre')
      .then(({ data }) => setEmpresas((data ?? []) as never))
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

  const poner = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => setF((x) => (x ? { ...x, [campo]: valor } : x))

  function cambiarEstado(estado: Estado) {
    setF((x) => x ? { ...x, estado, probabilidad: probTocada ? x.probabilidad : estadoInfo(estado).probabilidad } : x)
  }

  function cambiarServicio(nombre: string) {
    const s = servicios.find((x) => x.nombre === nombre)
    setF((x) => x ? { ...x, servicio: nombre, valor: !x.valor || Number(x.valor) === 0 ? String(s?.precio_base ?? '') : x.valor } : x)
  }

  async function guardar() {
    if (!f) return
    const cliente = f.tipoCliente === 'empresa' ? f.id_empresa_fk : f.id_particular_fk
    if (!cliente) return setError(f.tipoCliente === 'empresa' ? 'Elige la empresa' : 'Elige el particular')
    if (f.estado === 'cita' && !f.fecha_cita) return setError('Indica la fecha de la cita')
    if (f.estado === 'descartado' && !f.motivo_descarte) return setError('Indica el motivo del descarte')
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
      aviso(oportunidad ? 'Oportunidad guardada' : 'Oportunidad creada')
      onGuardada(r.data.id_oportunidad)
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
      titulo={oportunidad ? 'Editar oportunidad' : 'Nueva oportunidad'}
      subtitulo={oportunidad ? undefined : 'Una consulta, un presupuesto o un servicio que puede acabar en venta.'}
      onSubmit={guardar}
      ancho="lg"
      pie={
        <>
          <ErrorForm mensaje={error} />
          <button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn-primario" disabled={guardando}>
            {!oportunidad && <Icono nombre="mas" tamano={14} />} {guardando ? 'Guardando…' : oportunidad ? 'Guardar cambios' : 'Crear oportunidad'}
          </button>
        </>
      }
    >
      <div className="seccion-form">
        <p className="titulo-seccion">Cliente</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <div className="inline-flex rounded-lg border border-borde bg-superficie-2 p-0.5">
              {(['particular', 'empresa'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setF((x) => x ? { ...x, tipoCliente: t, id_animal_fk: '' } : x)}
                  className={cn('h-7 rounded-md px-3 text-[13px]', f.tipoCliente === t ? 'bg-superficie font-medium text-texto shadow-sm' : 'text-texto-3')}
                >
                  {t === 'particular' ? 'Particular' : 'Empresa'}
                </button>
              ))}
            </div>
          </div>
          {f.tipoCliente === 'particular' ? (
            <Campo etiqueta="Particular" obligatorio>
              <select className="input" value={f.id_particular_fk} onChange={(e) => setF((x) => x ? { ...x, id_particular_fk: e.target.value, id_animal_fk: '' } : x)}>
                <option value="">Elige…</option>
                {particulares.map((p) => <option key={p.id_particular} value={p.id_particular}>{nombreCompleto(p)}</option>)}
              </select>
            </Campo>
          ) : (
            <Campo etiqueta="Empresa" obligatorio>
              <select className="input" value={f.id_empresa_fk} onChange={(e) => setF((x) => x ? { ...x, id_empresa_fk: e.target.value, id_animal_fk: '' } : x)}>
                <option value="">Elige…</option>
                {empresas.map((e) => <option key={e.id_empresa} value={e.id_empresa}>{e.nombre}</option>)}
              </select>
            </Campo>
          )}
          <Campo etiqueta="Animal" ayuda={(f.id_particular_fk || f.id_empresa_fk) && !animales.length ? 'Este cliente no tiene animales registrados' : undefined}>
            <select className="input" value={f.id_animal_fk} onChange={(e) => poner('id_animal_fk', e.target.value)} disabled={!animales.length}>
              <option value="">{animales.length ? 'Ninguno en concreto' : '—'}</option>
              {animales.map((a) => <option key={a.id_animal} value={a.id_animal}>{nombreConEspecie(a)}</option>)}
            </select>
          </Campo>
        </div>
      </div>

      <div className="seccion-form">
        <p className="titulo-seccion">Oportunidad</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Título" className="sm:col-span-2" ayuda="Si lo dejas vacío se pone el servicio y el animal.">
            <input className="input" value={f.titulo} onChange={(e) => poner('titulo', e.target.value)} placeholder="Vacunación de Kiko" />
          </Campo>
          <Campo etiqueta="Servicio">
            <select className="input" value={f.servicio} onChange={(e) => cambiarServicio(e.target.value)}>
              <option value="">Sin indicar</option>
              {servicios.map((s) => <option key={s.id_servicio} value={s.nombre}>{s.nombre}</option>)}
              {f.servicio && !servicios.some((s) => s.nombre === f.servicio) && <option value={f.servicio}>{f.servicio}</option>}
            </select>
          </Campo>
          <Campo etiqueta="Valor (€)">
            <input className="input" type="number" min={0} step="0.01" value={f.valor} onChange={(e) => poner('valor', e.target.value)} placeholder="0" />
          </Campo>
          <Campo etiqueta="Estado">
            <select className="input" value={f.estado} onChange={(e) => cambiarEstado(e.target.value as Estado)}>
              {ESTADOS.map((e) => <option key={e.id} value={e.id} title={e.ayuda}>{e.texto}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Responsable">
            <select className="input" value={f.id_responsable_fk} onChange={(e) => poner('id_responsable_fk', e.target.value)}>
              <option value="">Sin asignar</option>
              {empleados.map((e) => <option key={e.id_empleado} value={e.id_empleado}>{nombreCompleto(e)}</option>)}
            </select>
          </Campo>
          {f.estado === 'descartado' && (
            <Campo etiqueta="Motivo del descarte" obligatorio className="sm:col-span-2">
              <select className="input" value={f.motivo_descarte} onChange={(e) => poner('motivo_descarte', e.target.value)}>
                <option value="">Elige…</option>
                {MOTIVOS_DESCARTE.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Campo>
          )}
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="label !mb-0">Probabilidad de que salga adelante</span>
              <span className="text-[13px] font-medium tabular-nums">{f.probabilidad}%</span>
            </div>
            <input
              type="range" min={0} max={100} step={5} value={f.probabilidad}
              onChange={(e) => { setProbTocada(true); poner('probabilidad', Number(e.target.value)) }}
              className="w-full accent-[var(--texto)]"
              aria-label="Probabilidad"
            />
            <BarraProbabilidad valor={f.probabilidad} segmentos={40} mostrarValor={false} grande className="mt-2 [&>div]:w-full [&>div>span]:flex-1" />
          </div>
        </div>
      </div>

      <div className="seccion-form">
        <p className="titulo-seccion">Agenda</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Fecha de la cita" obligatorio={f.estado === 'cita'}>
            <input className="input" type="date" value={f.fecha_cita} onChange={(e) => poner('fecha_cita', e.target.value)} />
          </Campo>
          <Campo etiqueta="Hora">
            <input className="input" type="time" value={f.hora_cita} onChange={(e) => poner('hora_cita', e.target.value)} />
          </Campo>
          <Campo etiqueta="Próximo seguimiento">
            <input className="input" type="date" value={f.fecha_seguimiento} onChange={(e) => poner('fecha_seguimiento', e.target.value)} />
          </Campo>
          <Campo etiqueta="Origen">
            <select className="input" value={f.origen} onChange={(e) => poner('origen', e.target.value as Origen)}>
              {ORIGENES.map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Mensaje o notas" className="sm:col-span-3">
            <textarea className="input" rows={3} value={f.mensaje} onChange={(e) => poner('mensaje', e.target.value)} placeholder="Lo que ha pedido el cliente…" />
          </Campo>
        </div>
      </div>
    </Modal>
  )
}
