'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIAS, TIPOS_IVA, TIPOS_SERVICIO } from '@/lib/ventas-utils'
import { cn, errorLegible } from '@/lib/utils'
import { useAviso } from '@/hooks/useAviso'
import { olvidarCatalogos } from '@/hooks/useCatalogos'
import type { Servicio, TipoServicio } from '@/types'
import Modal from '@/components/ui/Modal'
import Campo, { ErrorForm, resumenErrores, type Errores } from '@/components/ui/Campo'

const VACIO = { nombre: '', tipo: 'servicio' as TipoServicio, categoria: '', precio_base: '', iva: '21', descripcion: '' }
/** DECIMAL(10,2) de la base de datos */
const PRECIO_MAXIMO = 99999999.99
/** What each VAT rate is usually applied to, shown next to it in the selector */
const USO_IVA: Record<number, string> = { 21: 'servicios veterinarios', 10: 'medicamentos' }

/** Crear o editar un producto o servicio del catálogo (solo administradores) */
export default function FormProducto({
  abierto,
  onCerrar,
  producto,
  onGuardado,
}: {
  abierto: boolean
  onCerrar: () => void
  producto?: Servicio | null
  onGuardado: (id: string) => void
}) {
  const { aviso } = useAviso()
  const [f, setF] = useState(VACIO)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)

  // Al abrir (o cambiar de producto) se rellena el formulario durante el render, sin efecto
  const [abiertoCon, setAbiertoCon] = useState<Servicio | null | undefined>(undefined)
  const actual = abierto ? producto ?? null : undefined
  if (actual !== abiertoCon) {
    setAbiertoCon(actual)
    if (abierto) {
      setF(producto ? {
        nombre: producto.nombre, tipo: producto.tipo, categoria: producto.categoria ?? '',
        precio_base: String(producto.precio_base), iva: String(producto.iva), descripcion: producto.descripcion ?? '',
      } : VACIO)
      setError(null)
      setErrores({})
    }
  }

  const poner = <K extends keyof typeof VACIO>(campo: K, valor: (typeof VACIO)[K]) => {
    setF((x) => ({ ...x, [campo]: valor }))
    if (errores[campo]) setErrores((x) => { const r = { ...x }; delete r[campo]; return r })
  }

  // Si la categoría guardada ya no está en la lista, se sigue pudiendo elegir
  const categorias = f.categoria && !CATEGORIAS.includes(f.categoria) ? [...CATEGORIAS, f.categoria].sort() : CATEGORIAS
  const precio = Number(f.precio_base)
  const precioValido = f.precio_base !== '' && Number.isFinite(precio) && precio >= 0

  async function guardar() {
    const e: Errores = {}
    if (!f.nombre.trim()) e.nombre = 'Falta el nombre, por ejemplo «Consulta general» o «Collar isabelino».'
    if (f.precio_base === '') e.precio_base = 'Falta el precio sin IVA. Escribe 0 si es gratis.'
    else if (!precioValido) e.precio_base = 'El precio no puede ser negativo. Escribe un importe como 25,50.'
    else if (precio > PRECIO_MAXIMO) e.precio_base = 'El precio es demasiado alto. Escribe un importe menor de 100.000.000 €.'
    setErrores(e)
    if (Object.keys(e).length) return setError(resumenErrores(e))
    setGuardando(true)
    setError(null)
    try {
      const sb = createClient()
      const datos = {
        nombre: f.nombre.trim(), tipo: f.tipo, categoria: f.categoria || null, precio_base: precio,
        iva: Number(f.iva), descripcion: f.descripcion.trim() || null,
      }
      const r = producto
        ? await sb.from('servicio').update(datos).eq('id_servicio', producto.id_servicio).select('id_servicio').single()
        : await sb.from('servicio').insert(datos).select('id_servicio').single()
      if (r.error) throw r.error
      olvidarCatalogos()
      aviso(producto ? `${datos.nombre} guardado` : `${datos.nombre} añadido al catálogo`)
      onGuardado(r.data.id_servicio)
      onCerrar()
    } catch (err) {
      // El nombre es único en la base de datos (también entre los archivados)
      if ((err as { code?: string } | null)?.code === '23505') {
        const msg = 'Ya hay un producto con este nombre (puede estar en Archivados). Cambia el nombre, por ejemplo añadiendo el tamaño o la marca.'
        setErrores((x) => ({ ...x, nombre: msg }))
        setError(resumenErrores({ nombre: msg }))
      } else setError(errorLegible(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={producto ? `Editar ${producto.nombre}` : 'Nuevo producto'}
      onSubmit={guardar}
      pie={
        <>
          <ErrorForm mensaje={error} />
          <button type="button" className="btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : producto ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </>
      }
    >
      <div className="seccion-form">
        <p className="titulo-seccion">Producto</p>
        <div className="space-y-6">
          <Campo etiqueta="Nombre" obligatorio nombre="nombre" error={errores.nombre}>
            <input className="input" maxLength={120} value={f.nombre} onChange={(e) => poner('nombre', e.target.value)} autoFocus />
          </Campo>
          <div>
            <span id="tipo-producto" className="label">Tipo</span>
            <div role="radiogroup" aria-labelledby="tipo-producto" className="inline-flex rounded-lg border border-borde bg-superficie-2">
              {TIPOS_SERVICIO.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={f.tipo === t.id} onClick={() => poner('tipo', t.id)}
                  className={cn('h-11 rounded-lg px-4 text-[14px]', f.tipo === t.id ? 'bg-superficie font-medium text-texto shadow-sm ring-1 ring-borde' : 'text-texto-3 hover:text-texto')}>
                  {t.texto}
                </button>
              ))}
            </div>
          </div>
          <Campo etiqueta="Categoría">
            <select className="input" value={f.categoria} onChange={(e) => poner('categoria', e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Descripción (opcional)">
            <textarea className="input" rows={2} value={f.descripcion} onChange={(e) => poner('descripcion', e.target.value)}
              placeholder="Sale debajo del nombre en el catálogo" />
          </Campo>
        </div>
      </div>
      <div className="seccion-form">
        <p className="titulo-seccion">Precio</p>
        <div className="space-y-6">
          <Campo etiqueta="Precio sin IVA (€)" obligatorio nombre="precio_base" error={errores.precio_base}>
            <input className="input" type="number" min={0} step="0.01" value={f.precio_base} onChange={(e) => poner('precio_base', e.target.value)} placeholder="0" />
          </Campo>
          <Campo etiqueta="IVA">
            <select className="input" value={f.iva} onChange={(e) => poner('iva', e.target.value)}>
              {TIPOS_IVA.map((t) => <option key={t} value={t}>{USO_IVA[t] ? `${t} % (${USO_IVA[t]})` : `${t} %`}</option>)}
            </select>
          </Campo>
        </div>
      </div>
    </Modal>
  )
}
