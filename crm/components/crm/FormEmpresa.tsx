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
import Campo, { ErrorForm } from '@/components/ui/Campo'
import SubirArchivo from '@/components/ui/SubirArchivo'
import Avatar from '@/components/ui/Avatar'
import Icono from '@/components/ui/Icono'

const VACIA = { nombre: '', sector: '', tipo_cliente: 'nuevo', cif: '', telefono: '', correo: '', ciudad: '', direccion: '', id_responsable_fk: '', notas: '' }

/** Crear o editar una empresa (como el "New Company" de la plantilla) */
export default function FormEmpresa({
  abierto,
  onCerrar,
  empresa,
  onGuardada,
}: {
  abierto: boolean
  onCerrar: () => void
  empresa?: EmpresaBase | null
  onGuardada: (id: string) => void
}) {
  const { empleados } = useCatalogos()
  const { aviso } = useAviso()
  const [f, setF] = useState(VACIA)
  const [logo, setLogo] = useState<File | null>(null)
  const [vistaLogo, setVistaLogo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setF(empresa ? {
      nombre: empresa.nombre, sector: empresa.sector ?? '', tipo_cliente: empresa.tipo_cliente, cif: empresa.cif ?? '',
      telefono: empresa.telefono ?? '', correo: empresa.correo ?? '', ciudad: empresa.ciudad ?? '', direccion: empresa.direccion ?? '',
      id_responsable_fk: empresa.id_responsable_fk ?? '', notas: empresa.notas ?? '',
    } : VACIA)
    setLogo(null)
    setVistaLogo(empresa?.logo ?? null)
    setError(null)
  }, [abierto, empresa])

  const cambiar = (campo: keyof typeof VACIA) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [campo]: e.target.value }))

  async function guardar() {
    if (!f.nombre.trim()) return setError('El nombre es obligatorio')
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
      aviso(empresa ? 'Empresa guardada' : 'Empresa creada')
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
            {!empresa && <Icono nombre="mas" tamano={14} />} {guardando ? 'Guardando…' : empresa ? 'Guardar cambios' : 'Crear empresa'}
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
            if (err) return setError(err)
            setLogo(a)
            setVistaLogo(a ? URL.createObjectURL(a) : null)
          }}
        >
          <Avatar nombre={f.nombre || 'E'} foto={vistaLogo} tamano="xl" cuadrado />
        </SubirArchivo>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre de la empresa" obligatorio className="sm:col-span-2">
            <input className="input" value={f.nombre} onChange={cambiar('nombre')} autoFocus placeholder="Granja El Soto" />
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Responsable en la clínica" className="sm:col-span-2">
            <select className="input" value={f.id_responsable_fk} onChange={cambiar('id_responsable_fk')}>
              <option value="">Sin asignar</option>
              {empleados.map((e) => <option key={e.id_empleado} value={e.id_empleado}>{nombreCompleto(e)} · {e.puesto}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Teléfono"><input className="input" type="tel" value={f.telefono} onChange={cambiar('telefono')} /></Campo>
          <Campo etiqueta="Correo"><input className="input" type="email" value={f.correo} onChange={cambiar('correo')} /></Campo>
          <Campo etiqueta="CIF"><input className="input" value={f.cif} onChange={cambiar('cif')} /></Campo>
          <Campo etiqueta="Ciudad"><input className="input" value={f.ciudad} onChange={cambiar('ciudad')} /></Campo>
          <Campo etiqueta="Dirección" className="sm:col-span-2"><input className="input" value={f.direccion} onChange={cambiar('direccion')} /></Campo>
          <Campo etiqueta="Notas" className="sm:col-span-2"><textarea className="input" rows={3} value={f.notas} onChange={cambiar('notas')} /></Campo>
        </div>
      </div>
    </Modal>
  )
}
