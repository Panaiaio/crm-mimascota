'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { esAbierta, probabilidadMedia, tipoClienteInfo } from '@/lib/crm-utils'
import { errorLegible, formatDia, formatEUR, nombreCompleto } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useAviso } from '@/hooks/useAviso'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Animal, Empresa, Oportunidad } from '@/types'
import CabeceraFicha, { CifrasFicha } from '@/components/ui/CabeceraFicha'
import Etiqueta from '@/components/ui/Etiqueta'
import Avatar from '@/components/ui/Avatar'
import Seccion, { Dato } from '@/components/ui/Seccion'
import Menu from '@/components/ui/Menu'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'
import BarraProbabilidad from '@/components/ui/BarraProbabilidad'
import { ErrorCarga, FichaCargando } from '@/components/ui/Cargando'
import ListaOportunidades from '@/components/crm/ListaOportunidades'
import ListaAnimales from '@/components/crm/ListaAnimales'
import FormEmpresa from '@/components/crm/FormEmpresa'
import FormAnimal from '@/components/crm/FormAnimal'
import FormOportunidad from '@/components/crm/FormOportunidad'

export default function EmpresaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { esAdmin } = useSesion()
  const { aviso, confirmar } = useAviso()
  const [modal, setModal] = useState<'editar' | 'animal' | 'oportunidad' | null>(null)

  const { datos, cargando, error, recargar } = useConsulta(async (sb) => {
    const e = sinError(await sb.from('empresa').select(`*,
      responsable:empleado(id_empleado, nombre, apellidos, foto),
      animal(id_animal, nombre, especie, raza, sexo, fecha_nacimiento),
      oportunidad(*, animal(id_animal, nombre, especie, raza))`).eq('id_empresa', id).maybeSingle())
    return e as (Empresa & { animal: Animal[]; oportunidad: Oportunidad[] }) | null
  }, [id])

  useTituloPagina({ titulo: datos?.nombre ?? 'Empresa', volver: { texto: 'Empresas', href: '/empresas' } }, [datos?.nombre])

  if (error) return <ErrorCarga mensaje={error} reintentar={recargar} />
  if (cargando && !datos) return <FichaCargando />
  if (!datos) return <Vacio icono="empresa" titulo="Esta empresa no existe"><Link href="/empresas" className="btn-secundario">Ver empresas</Link></Vacio>

  const e = datos
  const tipo = tipoClienteInfo(e.tipo_cliente)
  const abiertas = e.oportunidad.filter((o) => esAbierta(o.estado))
  const atendidas = e.oportunidad.filter((o) => o.estado === 'atendido')

  async function eliminar() {
    if (!(await confirmar({ titulo: `¿Eliminar ${e.nombre}?`, texto: `Se borrarán también sus ${e.animal.length} animales. Sus oportunidades se conservan sin empresa.`, boton: 'Eliminar', peligro: true }))) return
    const { error: err } = await createClient().from('empresa').delete().eq('id_empresa', e.id_empresa)
    if (err) return aviso(errorLegible(err), 'error')
    aviso('Empresa eliminada')
    router.push('/empresas')
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 pt-2 pb-10 sm:px-6">
      <CabeceraFicha
        nombre={e.nombre}
        foto={e.logo}
        cuadrado
        etiquetas={<>{e.sector && <Etiqueta>{e.sector}</Etiqueta>}<Etiqueta tono={tipo.tono}>{tipo.texto}</Etiqueta></>}
        subtitulo={[e.ciudad, e.cif].filter(Boolean).join(' · ') || 'Empresa cliente'}
        acciones={
          <>
            {e.telefono && <a href={`tel:${e.telefono.replace(/\s/g, '')}`} className="btn-secundario"><Icono nombre="telefono" tamano={14} /> Llamar</a>}
            {e.correo && <a href={`mailto:${e.correo}`} className="btn-secundario"><Icono nombre="correo" tamano={14} /> Email</a>}
            <button type="button" className="btn-primario" onClick={() => setModal('oportunidad')}><Icono nombre="mas" tamano={14} /> Nueva oportunidad</button>
            <Menu opciones={[
              { texto: 'Editar empresa', icono: 'lapiz', onClick: () => setModal('editar') },
              { texto: 'Eliminar', icono: 'papelera', onClick: eliminar, peligro: true, oculto: !esAdmin },
            ]} />
          </>
        }
      >
        <CifrasFicha cifras={[
          { etiqueta: 'Oportunidades abiertas', valor: abiertas.length },
          { etiqueta: 'Valor en curso', valor: formatEUR(abiertas.reduce((s, o) => s + Number(o.valor), 0)) },
          { etiqueta: 'Probabilidad media', valor: abiertas.length ? <BarraProbabilidad valor={probabilidadMedia(abiertas)} className="mt-1.5" /> : '—' },
          { etiqueta: 'Facturado (atendidas)', valor: formatEUR(atendidas.reduce((s, o) => s + Number(o.valor), 0)) },
        ]} />
      </CabeceraFicha>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Seccion titulo={`Oportunidades (${e.oportunidad.length})`} sinPadding>
            <ListaOportunidades oportunidades={e.oportunidad} vacio="Esta empresa aún no tiene oportunidades" />
          </Seccion>
          <Seccion titulo={`Sus animales (${e.animal.length})`} acciones={<button type="button" className="btn-secundario" onClick={() => setModal('animal')}><Icono nombre="mas" tamano={14} /> Añadir animal</button>}>
            <ListaAnimales animales={e.animal} vacio="Todavía no tiene animales" />
            <p className="mt-3 text-[12px] text-texto-3">Los animales de una empresa pertenecen solo a esa empresa.</p>
          </Seccion>
        </div>
        <Seccion titulo="Datos">
          <dl>
            <Dato etiqueta="Responsable">
              {e.responsable ? <span className="flex items-center gap-2"><Avatar nombre={nombreCompleto(e.responsable)} foto={e.responsable.foto} />{nombreCompleto(e.responsable)}</span> : 'Sin asignar'}
            </Dato>
            <Dato etiqueta="Teléfono">{e.telefono ? <a href={`tel:${e.telefono.replace(/\s/g, '')}`} className="enlace">{e.telefono}</a> : '—'}</Dato>
            <Dato etiqueta="Correo">{e.correo ? <a href={`mailto:${e.correo}`} className="enlace">{e.correo}</a> : '—'}</Dato>
            <Dato etiqueta="CIF">{e.cif ?? '—'}</Dato>
            <Dato etiqueta="Dirección">{[e.direccion, e.ciudad].filter(Boolean).join(', ') || '—'}</Dato>
            <Dato etiqueta="Cliente desde">{formatDia(e.fecha_creacion)}</Dato>
            {e.notas && <Dato etiqueta="Notas"><span className="whitespace-pre-line">{e.notas}</span></Dato>}
          </dl>
        </Seccion>
      </div>

      <FormEmpresa abierto={modal === 'editar'} empresa={e} onCerrar={() => setModal(null)} onGuardada={() => recargar()} />
      <FormAnimal abierto={modal === 'animal'} empresaId={e.id_empresa} onCerrar={() => setModal(null)} onGuardado={() => recargar()} />
      <FormOportunidad abierto={modal === 'oportunidad'} inicial={{ id_empresa_fk: e.id_empresa }} onCerrar={() => setModal(null)} onGuardada={(idO) => router.push(`/oportunidades/${idO}`)} />
    </div>
  )
}
