'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ESTADOS_ABIERTOS, SELECT_ANIMALES_DE_PARTICULAR, animalesDe, nombreConEspecie } from '@/lib/crm-utils'
import { CONDICIONES_PAGO, codigoVenta, esVentaEditable } from '@/lib/ventas-utils'
import { cn, errorLegible, hoyISO, nombreCompleto, sumarDias } from '@/lib/utils'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useAviso } from '@/hooks/useAviso'
import { useSesion } from '@/hooks/useSesion'
import type { AnimalBreve, CondicionPago, Oportunidad, Particular, Venta, VentaBase } from '@/types'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm, resumenErrores, type Errores } from '@/components/ui/Campo'
import SelectorBuscable from '@/components/ui/SelectorBuscable'
import Pasos from '@/components/ui/Pasos'
import FormParticular from '@/components/crm/FormParticular'
import FormEmpresa from '@/components/crm/FormEmpresa'
import Icono from '@/components/ui/Icono'

/** Datos con los que se abre un presupuesto nuevo (por ejemplo, desde una oportunidad) */
export interface InicialVenta {
  id_particular_fk?: string | null
  id_empresa_fk?: string | null
  id_animal_fk?: string | null
  id_oportunidad_fk?: string | null
}

interface Formulario {
  tipoCliente: 'particular' | 'empresa'
  id_particular_fk: string
  id_empresa_fk: string
  id_animal_fk: string
  id_oportunidad_fk: string
  id_responsable_fk: string
  fecha: string
  fecha_validez: string
  condiciones_pago: CondicionPago
  notas: string
}

type OportunidadCliente = Pick<Oportunidad, 'id_oportunidad' | 'titulo' | 'estado' | 'id_particular_fk' | 'id_empresa_fk'>

const PASOS = ['Cliente', 'Condiciones']
const ERROR_VALIDEZ = 'La validez no puede ser anterior a la fecha del presupuesto. Elige un día igual o posterior.'

/** Errores de la base de datos que corresponden a un campo concreto (y el paso en el que está) */
function errorDeCampo(e: unknown): { campo: keyof Formulario; paso: number; mensaje: string } | null {
  const err = e as { message?: string; code?: string } | null
  const msg = err?.message ?? ''
  if (/^Ese animal no es de este cliente/.test(msg)) return { campo: 'id_animal_fk', paso: 0, mensaje: msg }
  if (err?.code === '23514' && /fecha_validez|venta_check/.test(msg)) return { campo: 'fecha_validez', paso: 1, mensaje: ERROR_VALIDEZ }
  return null
}

/** Crear o editar la cabecera de un presupuesto (las líneas se editan en su ficha) */
export default function FormVenta({
  abierto,
  onCerrar,
  venta,
  inicial,
  pasoInicial,
  onGuardada,
}: {
  abierto: boolean
  onCerrar: () => void
  venta?: Venta | null
  inicial?: InicialVenta
  pasoInicial?: 0 | 1
  onGuardada: (id: string) => void
}) {
  const { empleados } = useCatalogos()
  const { empleado } = useSesion()
  const { aviso } = useAviso()
  const [f, setF] = useState<Formulario | null>(null)
  const [particulares, setParticulares] = useState<(Pick<Particular, 'id_particular' | 'nombre' | 'apellidos' | 'telefono'> & { animal_particular: { animal: AnimalBreve }[] })[]>([])
  const [empresas, setEmpresas] = useState<{ id_empresa: string; nombre: string; animal: AnimalBreve[] }[]>([])
  const [oportunidades, setOportunidades] = useState<OportunidadCliente[]>([])
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [paso, setPaso] = useState(0)
  const [creando, setCreando] = useState<{ tipo: 'particular' | 'empresa'; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Pedido confirmado o cancelado: la base de datos solo deja cambiar las notas
  const soloNotas = !!venta && !esVentaEditable(venta.estado)

  function cargarClientes() {
    const sb = createClient()
    sb.from('particular').select(`id_particular, nombre, apellidos, telefono, ${SELECT_ANIMALES_DE_PARTICULAR}`).order('nombre')
      .then(({ data }) => setParticulares((data ?? []) as never))
    sb.from('empresa').select('id_empresa, nombre, animal(id_animal, nombre, especie, raza)').order('nombre')
      .then(({ data }) => setEmpresas((data ?? []) as never))
  }

  // Oportunidades abiertas y, además, la que ya está vinculada (aunque esté cerrada)
  function cargarOportunidades(vinculada: string | null) {
    const abiertas = `estado.in.(${ESTADOS_ABIERTOS.join(',')})`
    createClient().from('oportunidad').select('id_oportunidad, titulo, estado, id_particular_fk, id_empresa_fk')
      .or(vinculada ? `${abiertas},id_oportunidad.eq.${vinculada}` : abiertas)
      .order('fecha_creacion', { ascending: false })
      .then(({ data }) => setOportunidades((data ?? []) as OportunidadCliente[]))
  }

  // Al abrir (o cambiar de venta) se rellena el formulario durante el render, sin efecto.
  // La clave es un texto porque "inicial" suele llegar como objeto nuevo en cada render.
  const vinculada = (venta ? venta.id_oportunidad_fk : inicial?.id_oportunidad_fk) ?? null
  const clave = abierto ? `${venta?.id_venta ?? 'nueva'}|${venta?.fecha_actualizacion ?? ''}|${JSON.stringify(inicial ?? {})}` : null
  const [abiertoCon, setAbiertoCon] = useState<string | null>(null)
  if (clave !== abiertoCon) {
    setAbiertoCon(clave)
    if (abierto) rellenar()
  }

  // Los clientes y las oportunidades se piden cada vez que se abre
  useEffect(() => {
    if (!abierto || soloNotas) return
    cargarClientes()
    cargarOportunidades(vinculada)
  }, [abierto, soloNotas, vinculada])

  function rellenar() {
    const v = venta
    const fecha = v?.fecha ?? hoyISO()
    setF({
      tipoCliente: (v ? v.id_empresa_fk : inicial?.id_empresa_fk) ? 'empresa' : 'particular',
      id_particular_fk: (v ? v.id_particular_fk : inicial?.id_particular_fk) ?? '',
      id_empresa_fk: (v ? v.id_empresa_fk : inicial?.id_empresa_fk) ?? '',
      id_animal_fk: (v ? v.id_animal_fk : inicial?.id_animal_fk) ?? '',
      id_oportunidad_fk: (v ? v.id_oportunidad_fk : inicial?.id_oportunidad_fk) ?? '',
      id_responsable_fk: v ? v.id_responsable_fk ?? '' : empleado?.id_empleado ?? '',
      fecha,
      fecha_validez: v?.fecha_validez ?? sumarDias(fecha, 30),
      condiciones_pago: v?.condiciones_pago ?? 'contado',
      notas: v?.notas ?? '',
    })
    setError(null)
    setErrores({})
    setPaso(venta ? pasoInicial ?? 0 : 0)
  }

  const animales = useMemo(() => {
    if (!f) return []
    if (f.tipoCliente === 'empresa') return empresas.find((e) => e.id_empresa === f.id_empresa_fk)?.animal ?? []
    const p = particulares.find((x) => x.id_particular === f.id_particular_fk)
    return p ? animalesDe(p) : []
  }, [f, particulares, empresas])

  const oportunidadesCliente = useMemo(() => {
    if (!f) return []
    return oportunidades.filter((o) => f.tipoCliente === 'empresa'
      ? !!f.id_empresa_fk && o.id_empresa_fk === f.id_empresa_fk
      : !!f.id_particular_fk && o.id_particular_fk === f.id_particular_fk)
  }, [f, oportunidades])

  if (!f) return null

  const quitarErrores = (...campos: (keyof Formulario)[]) => {
    if (campos.some((c) => errores[c])) setErrores((x) => { const r = { ...x }; for (const c of campos) delete r[c]; return r })
  }

  const poner = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setF((x) => (x ? { ...x, [campo]: valor } : x))
    quitarErrores(campo)
  }

  // Al cambiar de cliente, el animal y la oportunidad dejan de valer
  function ponerCliente(cambios: Partial<Pick<Formulario, 'tipoCliente' | 'id_particular_fk' | 'id_empresa_fk'>>) {
    setF((x) => (x ? { ...x, ...cambios, id_animal_fk: '', id_oportunidad_fk: '' } : x))
    quitarErrores('id_particular_fk', 'id_empresa_fk', 'id_animal_fk')
  }

  // Si la validez seguía siendo la de por defecto (30 días), se mueve con la fecha
  function cambiarFecha(fecha: string) {
    setF((x) => x ? { ...x, fecha, fecha_validez: x.fecha_validez === sumarDias(x.fecha, 30) && fecha ? sumarDias(fecha, 30) : x.fecha_validez } : x)
    quitarErrores('fecha', 'fecha_validez')
  }

  // Errores de cada paso, con lo que hay que hacer para arreglarlos
  function erroresDelPaso(i: number, x: Formulario): Errores {
    const e: Errores = {}
    if (soloNotas) return e
    if (i === 0) {
      if (x.tipoCliente === 'particular' && !x.id_particular_fk) e.id_particular_fk = 'Falta el particular. Búscalo por su nombre o créalo con «+ Crear particular».'
      if (x.tipoCliente === 'empresa' && !x.id_empresa_fk) e.id_empresa_fk = 'Falta la empresa. Búscala por su nombre o créala con «+ Crear empresa».'
    }
    if (i === 1) {
      if (!x.fecha) e.fecha = 'Falta la fecha. Elige el día del presupuesto.'
      if (!x.fecha_validez) e.fecha_validez = 'Falta la validez. Elige hasta qué día vale el presupuesto.'
      else if (x.fecha && x.fecha_validez < x.fecha) e.fecha_validez = ERROR_VALIDEZ
    }
    return e
  }
  const pasoHecho = (i: number) => !!f && Object.keys(erroresDelPaso(i, f)).length === 0 && (i < paso || !!venta)

  function siguiente() {
    if (!f) return
    const e = erroresDelPaso(paso, f)
    setErrores(e)
    if (Object.keys(e).length) return setError(resumenErrores(e))
    setError(null)
    setPaso((p) => p + 1)
  }

  async function guardar() {
    if (!f) return
    // Al crear, "Enter" en un paso intermedio pasa al siguiente
    if (!venta && paso < PASOS.length - 1) return siguiente()
    // Se comprueban todos los pasos y se lleva al primero que tenga algo que corregir
    for (let i = 0; i < PASOS.length; i++) {
      const e = erroresDelPaso(i, f)
      if (Object.keys(e).length) { setPaso(i); setErrores(e); return setError(resumenErrores(e)) }
    }
    setErrores({})
    setGuardando(true)
    setError(null)
    const notas = f.notas.trim() || null
    // Solo columnas de la cabecera: el estado, el número, los importes y sus fechas los pone la base de datos
    const datos: Partial<VentaBase> = soloNotas ? { notas } : {
      id_particular_fk: f.tipoCliente === 'particular' ? f.id_particular_fk : null,
      id_empresa_fk: f.tipoCliente === 'empresa' ? f.id_empresa_fk : null,
      id_animal_fk: f.id_animal_fk || null,
      id_oportunidad_fk: f.id_oportunidad_fk || null,
      id_responsable_fk: f.id_responsable_fk || null,
      fecha: f.fecha,
      fecha_validez: f.fecha_validez,
      condiciones_pago: f.condiciones_pago,
      notas,
    }
    try {
      const sb = createClient()
      const r = venta
        ? await sb.from('venta').update(datos).eq('id_venta', venta.id_venta).select('id_venta, numero').single()
        : await sb.from('venta').insert(datos).select('id_venta, numero').single()
      if (r.error) throw r.error
      const codigo = codigoVenta(r.data.numero)
      aviso(venta ? `Presupuesto ${codigo} guardado` : `Presupuesto ${codigo} creado`, 'exito')
      onGuardada(r.data.id_venta)
      onCerrar()
    } catch (e) {
      const deCampo = errorDeCampo(e)
      if (deCampo) {
        const errs = { [deCampo.campo]: deCampo.mensaje }
        setPaso(deCampo.paso)
        setErrores(errs)
        setError(resumenErrores(errs))
      } else setError(errorLegible(e))
    } finally {
      setGuardando(false)
    }
  }

  const ultimo = soloNotas || paso === PASOS.length - 1
  const opcionesParticular = particulares.map((p) => ({ id: p.id_particular, texto: nombreCompleto(p), detalle: p.telefono ?? undefined }))
  const opcionesEmpresa = empresas.map((e) => ({ id: e.id_empresa, texto: e.nombre }))
  const hayCliente = !!(f.tipoCliente === 'empresa' ? f.id_empresa_fk : f.id_particular_fk)

  const campoNotas = (
    <Campo etiqueta="Notas" ayuda={soloNotas ? (venta.estado === 'pedido' ? 'Este pedido ya está confirmado: solo se pueden cambiar las notas.' : 'Este presupuesto está cancelado: solo se pueden cambiar las notas.') : 'Lo que quieras recordar o que deba saber el cliente.'}>
      <textarea className="input" rows={3} value={f.notas} onChange={(e) => poner('notas', e.target.value)} />
    </Campo>
  )

  return (
    <>
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={venta ? `Editar ${venta.estado === 'pedido' ? 'pedido' : 'presupuesto'} ${codigoVenta(venta.numero)}` : 'Nuevo presupuesto'}
      subtitulo={venta ? undefined : 'Después podrás añadir las líneas.'}
      onSubmit={guardar}
      ancho="md"
      pie={
        <>
          <ErrorForm mensaje={error} />
          <button type="button" className="btn-fantasma" onClick={onCerrar}>Cancelar</button>
          {!soloNotas && paso > 0 && <button type="button" className="btn-secundario" onClick={() => { setError(null); setErrores({}); setPaso((p) => p - 1) }}><Icono nombre="izquierda" tamano={14} /> Anterior</button>}
          {!venta && !ultimo ? (
            <button key="siguiente" type="button" className="btn-primario" onClick={siguiente}>Siguiente <Icono nombre="derecha" tamano={14} /></button>
          ) : (
            <button key="guardar" type="submit" className="btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : venta ? 'Guardar cambios' : 'Crear presupuesto'}
            </button>
          )}
        </>
      }
    >
      {soloNotas ? <div className="seccion-form space-y-6">{campoNotas}</div> : (
        <>
          <Pasos pasos={PASOS} actual={paso} hechos={PASOS.map((_, i) => pasoHecho(i))}
            onIr={(i) => { if (venta || i < paso) { setError(null); setErrores({}); setPaso(i) } }} />

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
                      onClick={() => { if (f.tipoCliente !== t) ponerCliente({ tipoCliente: t }) }}
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
                    onChange={(id) => ponerCliente({ id_particular_fk: id })}
                    ayuda="Buscar particular…" textoCrear="Crear particular" onCrear={(texto) => setCreando({ tipo: 'particular', texto })} />
                </Campo>
              ) : (
                <Campo etiqueta="Empresa" obligatorio nombre="id_empresa_fk" error={errores.id_empresa_fk}>
                  <SelectorBuscable valor={f.id_empresa_fk} opciones={opcionesEmpresa} invalido={!!errores.id_empresa_fk}
                    onChange={(id) => ponerCliente({ id_empresa_fk: id })}
                    ayuda="Buscar empresa…" textoCrear="Crear empresa" onCrear={(texto) => setCreando({ tipo: 'empresa', texto })} />
                </Campo>
              )}
              <Campo etiqueta="Animal" nombre="id_animal_fk" error={errores.id_animal_fk}
                ayuda={hayCliente && !animales.length ? 'Este cliente no tiene animales registrados.' : 'Opcional. Si es para un animal concreto.'}>
                <select className="input" value={f.id_animal_fk} onChange={(e) => poner('id_animal_fk', e.target.value)} disabled={!animales.length}>
                  <option value="">{animales.length ? 'Ninguno en concreto' : '—'}</option>
                  {animales.map((a) => <option key={a.id_animal} value={a.id_animal}>{nombreConEspecie(a)}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Oportunidad"
                ayuda={hayCliente && !oportunidadesCliente.length ? 'Este cliente no tiene oportunidades abiertas.' : 'Opcional. La consulta de la que sale este presupuesto.'}>
                <select className="input" value={f.id_oportunidad_fk} onChange={(e) => poner('id_oportunidad_fk', e.target.value)} disabled={!oportunidadesCliente.length}>
                  <option value="">{oportunidadesCliente.length ? 'Ninguna' : '—'}</option>
                  {oportunidadesCliente.map((o) => <option key={o.id_oportunidad} value={o.id_oportunidad}>{o.titulo}</option>)}
                </select>
              </Campo>
            </div>
          )}

          {paso === 1 && (
            <div className="seccion-form space-y-6">
              <Campo etiqueta="Comercial" ayuda="Quien lleva este presupuesto.">
                <select className="input" value={f.id_responsable_fk} onChange={(e) => poner('id_responsable_fk', e.target.value)}>
                  <option value="">Sin asignar</option>
                  {empleados.map((e) => <option key={e.id_empleado} value={e.id_empleado}>{nombreCompleto(e)}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Fecha" obligatorio nombre="fecha" error={errores.fecha}>
                <input className="input" type="date" value={f.fecha} onChange={(e) => cambiarFecha(e.target.value)} />
              </Campo>
              <Campo etiqueta="Validez" obligatorio nombre="fecha_validez" error={errores.fecha_validez} ayuda="Último día en el que el cliente puede aceptarlo.">
                <input className="input" type="date" value={f.fecha_validez} min={f.fecha || undefined} onChange={(e) => poner('fecha_validez', e.target.value)} />
              </Campo>
              <Campo etiqueta="Condiciones de pago">
                <select className="input" value={f.condiciones_pago} onChange={(e) => poner('condiciones_pago', e.target.value as CondicionPago)}>
                  {CONDICIONES_PAGO.map((c) => <option key={c.id} value={c.id}>{c.texto}</option>)}
                </select>
              </Campo>
              {campoNotas}
            </div>
          )}
        </>
      )}
    </Modal>

    {/* Crear el cliente sin salir del presupuesto */}
    <FormParticular abierto={creando?.tipo === 'particular'} nombreInicial={creando?.texto} onCerrar={() => setCreando(null)}
      onGuardado={(id) => { cargarClientes(); ponerCliente({ id_particular_fk: id }); setError(null) }} />
    <FormEmpresa abierto={creando?.tipo === 'empresa'} nombreInicial={creando?.texto} onCerrar={() => setCreando(null)}
      onGuardada={(id) => { cargarClientes(); ponerCliente({ id_empresa_fk: id }); setError(null) }} />
    </>
  )
}
