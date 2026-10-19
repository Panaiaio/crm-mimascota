'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subirFoto } from '@/lib/archivos'
import { SECTORES, TIPOS_CLIENTE } from '@/lib/crm-utils'
import { errorLegible, nombreCompleto } from '@/lib/utils'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useAviso } from '@/hooks/useAviso'
import type { EmpresaBase } from '@/types'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm, resumenErrores, type Errores } from '@/components/ui/Campo'
import SubirArchivo from '@/components/ui/SubirArchivo'
import Avatar from '@/components/ui/Avatar'
import Icono from '@/components/ui/Icono'

const VACIA = { nombre: '', sector: '', tipo_cliente: 'nuevo', cif: '', telefono: '', correo: '', ciudad: '', direccion: '', id_responsable_fk: '', notas: '' }

/** Crear o editar una empresa (como el "New Company" de la plantilla) */
export default function FormEmpresa({
  abierto,
  onCerrar,
  empresa,
  nombreInicial,
  onGuardada,
}: {
  abierto: boolean
  onCerrar: () => void
  empresa?: EmpresaBase | null
  /** Lo escrito en un buscador ("+ Crear empresa «Granja El Soto»") */
  nombreInicial?: string
  onGuardada: (id: string) => void
}) {
  const { empleados } = useCatalogos()
  const { aviso } = useAviso()
  const [f, setF] = useState(VACIA)
  const [logo, setLogo] = useState<File | null>(null)
  const [vistaLogo, setVistaLogo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setF(empresa ? {
      nombre: empresa.nombre, sector: empresa.sector ?? '', tipo_cliente: empresa.tipo_cliente, cif: empresa.cif ?? '',
      telefono: empresa.telefono ?? '', correo: empresa.correo ?? '', ciudad: empresa.ciudad ?? '', direccion: empresa.direccion ?? '',
      id_responsable_fk: empresa.id_responsable_fk ?? '', notas: empresa.notas ?? '',
    } : { ...VACIA, nombre: nombreInicial?.trim() ?? '' })
    setLogo(null)
    setVistaLogo(empresa?.logo ?? null)
    setError(null)
    setErrores({})
  }, [abierto, empresa, nombreInicial])

  const cambiar = (campo: keyof typeof VACIA) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF((x) => ({ ...x, [campo]: e.target.value }))
    if (errores[campo]) setErrores(({ [campo]: _, ...r }) => r)
  }

  async function guardar() {
    const e: Errores = {}
    if (!f.nombre.trim()) e.nombre = 'Falta el nombre. Escribe cómo se llama la empresa, por ejemplo «Granja El Soto».'
    if (f.telefono.trim() && f.telefono.replace(/\D/g, '').length !== 9) e.telefono = 'Faltan o sobran cifras. El teléfono tiene 9, por ejemplo 925 123 456.'
    if (f.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim())) e.correo = 'Falta algo en el correo. Escríbelo completo, por ejemplo info@granjaelsoto.es.'
    if (f.cif.trim() && !/^[A-Za-z]\d{7}[A-Za-z0-9]$/.test(f.cif.trim().replace(/[\s-]/g, ''))) e.cif = 'El CIF tiene 9 caracteres: una letra y 8 números o letras, por ejemplo B12345678.'
    setErrores(e)
    if (Object.keys(e).length) return setError(resumenErrores(e))
    setGuardando(true)
    setError(null)
    try {
      const sb = createClient()
      const datos = {
        nombre: f.nombre.trim(), sector: f.sector || null, tipo_cliente: f.tipo_cliente, cif: f.cif.trim() || null,
        telefono: f.telefono.trim() || null, correo: f.correo.trim().toLowerCase() || null, ciudad: f.ciudad.trim() || null,
        direccion: f.direccion.trim() || null, id_responsable_fk: f.id_responsable_fk || null, notas: f.notas.trim() || null,
        ...(logo ? { logo: await subirFoto(logo, 'empresas') } : {}),
      }
      const r = empresa
        ? await sb.from('empresa').update(datos).eq('id_empresa', empresa.id_empresa).select('id_empresa').single()
        : await sb.from('empresa').insert(datos).select('id_empresa').single()
      if (r.error) throw r.error
      aviso(empresa ? `Empresa ${datos.nombre} guardada` : `Empresa ${datos.nombre} creada`, 'exito', empresa ? {} : { ver: `/empresas/${r.data.id_empresa}` })
      onGuardada(r.data.id_empresa)
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
      titulo={empresa ? 'Editar empresa' : 'Nueva empresa'}
      subtitulo={empresa ? undefined : 'Añade una empresa cliente. Aparecerá en la lista al momento.'}
      onSubmit={guardar}
      pie={
        <>
          <ErrorForm mensaje={error} />
          <button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : empresa ? 'Guardar cambios' : 'Crear empresa'}
          </button>
        </>
      }
    >
      <div className="seccion-form">
        <p className="titulo-seccion">Empresa</p>
        <SubirArchivo
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          texto="Subir logo"
          ayuda="PNG, JPG, WebP o SVG hasta 2 MB. También puedes arrastrarlo aquí."
          maxMB={2}
          archivo={logo}
          onArchivo={(a, err) => {
            if (err) return setErrores((x) => ({ ...x, logo: err }))
            setErrores(({ logo: _, ...r }) => r)
            setLogo(a)
            setVistaLogo(a ? URL.createObjectURL(a) : null)
          }}
        >
          <Avatar nombre={f.nombre || 'E'} foto={vistaLogo} tamano="xl" cuadrado />
        </SubirArchivo>
        {errores.logo && <p role="alert" className="mt-2 text-[13px] text-rose-700 dark:text-rose-400">{errores.logo}</p>}
        <div className="mt-6 space-y-6">
          <Campo etiqueta="Nombre de la empresa" obligatorio nombre="nombre" error={errores.nombre}>
            <input className="input" value={f.nombre} onChange={cambiar('nombre')} autoFocus />
          </Campo>
          <Campo etiqueta="Sector">
            <select className="input" value={f.sector} onChange={cambiar('sector')}>
              <option value="">Sin indicar</option>
              {SECTORES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Tipo de cliente">
            <select className="input" value={f.tipo_cliente} onChange={cambiar('tipo_cliente')}>
              {TIPOS_CLIENTE.map((t) => <option key={t.id} value={t.id}>{t.texto}</option>)}
            </select>
          </Campo>
        </div>
      </div>

      <div className="seccion-form">
        <p className="titulo-seccion">Responsable y contacto</p>
        <div className="space-y-6">
          <Campo etiqueta="Responsable en la clínica">
            <select className="input" value={f.id_responsable_fk} onChange={cambiar('id_responsable_fk')}>
              <option value="">Sin asignar</option>
              {empleados.map((e) => <option key={e.id_empleado} value={e.id_empleado}>{nombreCompleto(e)} · {e.puesto}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Teléfono" nombre="telefono" error={errores.telefono}><input className="input" type="tel" value={f.telefono} onChange={cambiar('telefono')} /></Campo>
          <Campo etiqueta="Correo" nombre="correo" error={errores.correo}><input className="input" type="email" value={f.correo} onChange={cambiar('correo')} /></Campo>
          <Campo etiqueta="CIF" nombre="cif" error={errores.cif} ayuda="Por ejemplo, B12345678."><input className="input" value={f.cif} onChange={cambiar('cif')} /></Campo>
          <Campo etiqueta="Ciudad"><input className="input" value={f.ciudad} onChange={cambiar('ciudad')} /></Campo>
          <Campo etiqueta="Dirección"><input className="input" value={f.direccion} onChange={cambiar('direccion')} /></Campo>
          <Campo etiqueta="Notas"><textarea className="input" rows={3} value={f.notas} onChange={cambiar('notas')} /></Campo>
        </div>
      </div>
    </Modal>
  )
}
