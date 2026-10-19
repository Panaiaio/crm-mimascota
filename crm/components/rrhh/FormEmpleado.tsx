'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subirFoto } from '@/lib/archivos'
import { DEPARTAMENTOS } from '@/lib/rrhh-utils'
import { errorLegible, hoyISO } from '@/lib/utils'
import { olvidarCatalogos } from '@/hooks/useCatalogos'
import { useAviso } from '@/hooks/useAviso'
import type { Empleado, Rol } from '@/types'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm, resumenErrores, type Errores } from '@/components/ui/Campo'
import Pasos from '@/components/ui/Pasos'
import SubirArchivo from '@/components/ui/SubirArchivo'
import Avatar from '@/components/ui/Avatar'
import Icono from '@/components/ui/Icono'

const DOMINIO = 'mimascota.es'

/** Igual que generar_correo() de la base de datos: nombre.apellido@dominio */
export function correoCorporativo(nombre: string, apellidos: string) {
  const limpio = (s: string) => s.trim().split(/\s+/)[0]?.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') ?? ''
  const base = [limpio(nombre), limpio(apellidos)].filter(Boolean).join('.')
  return base ? `${base}@${DOMINIO}` : ''
}

const VACIO = {
  nombre: '', apellidos: '', correo: '', correo_personal: '', telefono: '', puesto: '', departamento: '',
  rol: 'empleado' as Rol, fecha_alta: hoyISO(), dias_vacaciones: '22', activo: true,
}

/** Crear o editar la ficha de un trabajador (solo administradores) */
export default function FormEmpleado({
  abierto,
  onCerrar,
  empleado,
  onGuardado,
}: {
  abierto: boolean
  onCerrar: () => void
  empleado?: Empleado | null
  onGuardado: (id: string) => void
}) {
  const { aviso } = useAviso()
  const [f, setF] = useState(VACIO)
  const [correoTocado, setCorreoTocado] = useState(false)
  const [foto, setFoto] = useState<File | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [paso, setPaso] = useState(0)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    const e = empleado
    setF(e ? {
      nombre: e.nombre, apellidos: e.apellidos ?? '', correo: e.correo, correo_personal: e.correo_personal ?? '', telefono: e.telefono ?? '',
      puesto: e.puesto, departamento: e.departamento ?? '', rol: e.rol, fecha_alta: e.fecha_alta, dias_vacaciones: String(e.dias_vacaciones), activo: e.activo,
    } : { ...VACIO, fecha_alta: hoyISO() })
    setCorreoTocado(!!e)
    setFoto(null)
    setVista(e?.foto ?? null)
    setError(null)
    setErrores({})
    setPaso(0)
  }, [abierto, empleado])

  function cambiar<K extends keyof typeof VACIO>(campo: K, valor: (typeof VACIO)[K]) {
    setF((x) => {
      const n = { ...x, [campo]: valor }
      if (!correoTocado && (campo === 'nombre' || campo === 'apellidos')) n.correo = correoCorporativo(n.nombre, n.apellidos)
      return n
    })
    if (errores[campo]) setErrores(({ [campo]: _, ...r }) => r)
  }

  const PASOS = ['Ficha', 'Cuenta y contrato']
  const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim())
  function erroresDelPaso(i: number): Errores {
    const e: Errores = {}
    if (i === 0) {
      if (!f.nombre.trim()) e.nombre = 'Falta el nombre. Escribe su nombre de pila, por ejemplo «Lucía».'
      if (!f.puesto.trim()) e.puesto = 'Falta el puesto. Escribe qué hace, por ejemplo «Veterinaria» o «Recepcionista».'
    }
    if (i === 1) {
      if (!f.correo.trim()) e.correo = `Falta el correo corporativo. Normalmente es nombre.apellido@${DOMINIO}.`
      else if (!correoValido(f.correo)) e.correo = `Falta algo en el correo. Escríbelo completo, por ejemplo lucia.gomez@${DOMINIO}.`
      if (f.correo_personal.trim() && !correoValido(f.correo_personal)) e.correo_personal = 'Falta algo en el correo. Escríbelo completo, por ejemplo lucia@gmail.com.'
      if (f.telefono.trim() && f.telefono.replace(/\D/g, '').length !== 9) e.telefono = 'Faltan o sobran cifras. El teléfono tiene 9, por ejemplo 612 345 678.'
      if (!f.fecha_alta) e.fecha_alta = 'Falta la fecha de alta. Elige el primer día de trabajo.'
      const d = Number(f.dias_vacaciones)
      if (!Number.isFinite(d) || d < 0 || d > 60) e.dias_vacaciones = 'Escribe un número de días entre 0 y 60. Lo normal son 22 laborables.'
    }
    return e
  }
  function siguiente() {
    const e = erroresDelPaso(paso)
    setErrores(e)
    if (Object.keys(e).length) return setError(resumenErrores(e))
    setError(null)
    setPaso((p) => p + 1)
  }

  async function guardar() {
    if (!empleado && paso < PASOS.length - 1) return siguiente()
    for (let i = 0; i < PASOS.length; i++) {
      const e = erroresDelPaso(i)
      if (Object.keys(e).length) { setPaso(i); setErrores(e); return setError(resumenErrores(e)) }
    }
    setErrores({})
    setGuardando(true)
    setError(null)
    try {
      const sb = createClient()
      const datos = {
        nombre: f.nombre.trim(), apellidos: f.apellidos.trim() || null, correo: f.correo.trim().toLowerCase(),
        correo_personal: f.correo_personal.trim().toLowerCase() || null, telefono: f.telefono.trim() || null,
        puesto: f.puesto.trim(), departamento: f.departamento.trim() || null, rol: f.rol, fecha_alta: f.fecha_alta,
        dias_vacaciones: Number(f.dias_vacaciones) || 0, activo: f.activo,
        ...(foto ? { foto: await subirFoto(foto, 'empleados') } : {}),
      }
      const r = empleado
        ? await sb.from('empleado').update(datos).eq('id_empleado', empleado.id_empleado).select('id_empleado').single()
        : await sb.from('empleado').insert(datos).select('id_empleado').single()
      if (r.error) throw r.error
      olvidarCatalogos()
      aviso(empleado ? `Ficha de ${datos.nombre} guardada` : `${datos.nombre} dado de alta, con su check de inicio`, 'exito', empleado ? {} : { ver: `/rrhh/empleados/${r.data.id_empleado}` })
      onGuardado(r.data.id_empleado)
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
      titulo={empleado ? 'Editar ficha' : 'Nuevo empleado'}
      subtitulo={empleado ? undefined : 'Al crearlo se le preparan automáticamente las tareas del primer día.'}
      onSubmit={guardar}
      pie={
        <>
          <ErrorForm mensaje={error} />
          <button type="button" className="btn-fantasma" onClick={onCerrar}>Cancelar</button>
          {paso > 0 && <button type="button" className="btn-secundario" onClick={() => { setError(null); setErrores({}); setPaso(0) }}><Icono nombre="izquierda" tamano={14} /> Anterior</button>}
          {!empleado && paso === 0 ? (
            <button key="siguiente" type="button" className="btn-primario" onClick={siguiente}>Siguiente <Icono nombre="derecha" tamano={14} /></button>
          ) : (
            <button key="guardar" type="submit" className="btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : empleado ? 'Guardar cambios' : 'Dar de alta'}
            </button>
          )}
        </>
      }
    >
      <Pasos pasos={PASOS} actual={paso} hechos={PASOS.map((_, i) => (i < paso || !!empleado) && !Object.keys(erroresDelPaso(i)).length)}
        onIr={(i) => { if (empleado || i < paso) { setError(null); setErrores({}); setPaso(i) } }} />
      {paso === 0 && (
      <div className="seccion-form">
        <SubirArchivo accept="image/png,image/jpeg,image/webp" texto="Subir foto" ayuda="JPG, PNG o WebP hasta 2 MB" maxMB={2} archivo={foto}
          onArchivo={(a, err) => { if (err) return setErrores((x) => ({ ...x, foto: err })); setErrores(({ foto: _, ...r }) => r); setFoto(a); setVista(a ? URL.createObjectURL(a) : null) }}>
          <Avatar nombre={`${f.nombre} ${f.apellidos}`.trim() || '?'} foto={vista} tamano="xl" />
        </SubirArchivo>
        {errores.foto && <p role="alert" className="mt-2 text-[13px] text-rose-700 dark:text-rose-400">{errores.foto}</p>}
        <div className="mt-6 space-y-6">
          <Campo etiqueta="Nombre" obligatorio nombre="nombre" error={errores.nombre}><input className="input" value={f.nombre} onChange={(e) => cambiar('nombre', e.target.value)} autoFocus /></Campo>
          <Campo etiqueta="Apellidos"><input className="input" value={f.apellidos} onChange={(e) => cambiar('apellidos', e.target.value)} /></Campo>
          <Campo etiqueta="Puesto" obligatorio nombre="puesto" error={errores.puesto} ayuda="Por ejemplo, Veterinaria o Recepcionista."><input className="input" value={f.puesto} onChange={(e) => cambiar('puesto', e.target.value)} /></Campo>
          <Campo etiqueta="Departamento">
            <input className="input" list="departamentos" value={f.departamento} onChange={(e) => cambiar('departamento', e.target.value)} />
            <datalist id="departamentos">{DEPARTAMENTOS.map((d) => <option key={d} value={d} />)}</datalist>
          </Campo>
        </div>
      </div>
      )}
      {paso === 1 && (
      <div className="seccion-form">
        <div className="space-y-6">
          <Campo etiqueta="Correo corporativo" obligatorio nombre="correo" error={errores.correo} ayuda="Es el correo con el que iniciará sesión en el CRM (créale el usuario en Supabase → Authentication).">
            <input className="input" type="email" value={f.correo} onChange={(e) => { setCorreoTocado(true); cambiar('correo', e.target.value) }} />
          </Campo>
          <Campo etiqueta="Correo personal" nombre="correo_personal" error={errores.correo_personal}><input className="input" type="email" value={f.correo_personal} onChange={(e) => cambiar('correo_personal', e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono" nombre="telefono" error={errores.telefono}><input className="input" type="tel" value={f.telefono} onChange={(e) => cambiar('telefono', e.target.value)} /></Campo>
          <Campo etiqueta="Fecha de alta" obligatorio nombre="fecha_alta" error={errores.fecha_alta}><input className="input" type="date" value={f.fecha_alta} onChange={(e) => cambiar('fecha_alta', e.target.value)} /></Campo>
          <Campo etiqueta="Días de vacaciones al año" nombre="dias_vacaciones" error={errores.dias_vacaciones} ayuda="Días laborables. Lo normal son 22."><input className="input" type="number" min={0} max={60} value={f.dias_vacaciones} onChange={(e) => cambiar('dias_vacaciones', e.target.value)} /></Campo>
          <Campo etiqueta="Permisos" ayuda="Un administrador concede vacaciones, evalúa, contrata y sube nóminas.">
            <select className="input" value={f.rol} onChange={(e) => cambiar('rol', e.target.value as Rol)}>
              <option value="empleado">Empleado</option>
              <option value="admin">Administrador</option>
            </select>
          </Campo>
          {empleado && (
            <Campo etiqueta="Estado">
              <select className="input" value={f.activo ? 'si' : 'no'} onChange={(e) => cambiar('activo', e.target.value === 'si')}>
                <option value="si">En plantilla</option>
                <option value="no">De baja (no puede entrar)</option>
              </select>
            </Campo>
          )}
        </div>
      </div>
      )}
    </Modal>
  )
}
