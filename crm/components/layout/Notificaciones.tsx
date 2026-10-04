'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSesion } from '@/hooks/useSesion'
import { cn, haceCuanto, hoyISO, nombreCompleto } from '@/lib/utils'
import { MESES } from '@/lib/rrhh-utils'
import Icono from '@/components/ui/Icono'
import type { Tono } from '@/types'
import { PUNTOS } from '@/components/ui/Etiqueta'

interface Notificacion {
  id: string
  texto: string
  detalle: string
  href: string
  tono: Tono
}

/** Campana de la cabecera con lo que requiere atención */
export default function Notificaciones() {
  const { empleado, esAdmin } = useSesion()
  const ruta = usePathname()
  const [lista, setLista] = useState<Notificacion[]>([])
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let vivo = true
    async function cargar() {
      const sb = createClient()
      const hoy = hoyISO()
      const n: Notificacion[] = []

      const { data: nuevas } = await sb.from('oportunidad').select('id_oportunidad, titulo, fecha_creacion, origen')
        .eq('estado', 'nuevo').order('fecha_creacion', { ascending: false }).limit(5)
      for (const o of nuevas ?? []) {
        n.push({ id: 'o' + o.id_oportunidad, texto: o.origen === 'web' ? 'Nueva oportunidad desde la web' : 'Oportunidad sin contestar', detalle: `${o.titulo} · ${haceCuanto(o.fecha_creacion)}`, href: `/oportunidades/${o.id_oportunidad}`, tono: 'gris' })
      }

      if (empleado) {
        const { data: vencidas } = await sb.from('oportunidad').select('id_oportunidad, titulo, fecha_seguimiento')
          .eq('id_responsable_fk', empleado.id_empleado).in('estado', ['nuevo', 'contactado', 'presupuesto'])
          .lt('fecha_seguimiento', hoy).limit(5)
        for (const o of vencidas ?? []) {
          n.push({ id: 's' + o.id_oportunidad, texto: 'Descartado', detalle: o.titulo, href: `/oportunidades/${o.id_oportunidad}`, tono: 'rojo' })
        }
        const { data: nominas } = await sb.from('nomina').select('id_nomina, anio, mes')
          .eq('id_empleado_fk', empleado.id_empleado).eq('firmada', false)
        for (const x of nominas ?? []) {
          n.push({ id: 'n' + x.id_nomina, texto: 'Nómina pendiente de firmar', detalle: `${MESES[x.mes - 1]} ${x.anio}`, href: '/rrhh/nominas', tono: 'amarillo' })
        }
        const { data: revisadas } = await sb.from('vacacion').select('id_vacacion, estado, fecha_inicio, fecha_revision')
          .eq('id_empleado_fk', empleado.id_empleado).neq('estado', 'pendiente')
          .gte('fecha_revision', new Date(Date.now() - 7 * 86_400_000).toISOString())
        for (const v of revisadas ?? []) {
          n.push({ id: 'v' + v.id_vacacion, texto: v.estado === 'aprobada' ? 'Vacaciones aprobadas' : 'Vacaciones rechazadas', detalle: `Desde el ${v.fecha_inicio.split('-').reverse().join('/')}`, href: '/rrhh/vacaciones', tono: v.estado === 'aprobada' ? 'verde' : 'rojo' })
        }
      }

      if (esAdmin) {
        const { data: pendientes } = await sb.from('vacacion').select('id_vacacion, dias, empleado:empleado!id_empleado_fk(nombre, apellidos)')
          .eq('estado', 'pendiente').limit(5)
        for (const v of pendientes ?? []) {
          const e = v.empleado as unknown as { nombre: string; apellidos: string | null }
          n.push({ id: 'p' + v.id_vacacion, texto: 'Vacaciones por revisar', detalle: `${nombreCompleto(e)} · ${v.dias} días`, href: '/rrhh/vacaciones', tono: 'amarillo' })
        }
      }
      if (vivo) setLista(n)
    }
    cargar().catch(() => {})
    return () => { vivo = false }
  }, [empleado, esAdmin, ruta])

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setAbierto(!abierto)} className="btn-icono relative rounded-full" aria-label="Notificaciones">
        <Icono nombre="campana" />
        {lista.length > 0 && <span className="absolute top-1.5 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-fondo" />}
      </button>
      {abierto && (
        <div className="animar-aparecer absolute top-full right-0 z-40 mt-2 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-borde bg-superficie shadow-[var(--sombra)]">
          <p className="border-b border-borde px-4 py-3 text-[13px] font-semibold">Notificaciones</p>
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {lista.length === 0 ? (
              <p className="px-3 py-8 text-center text-[13px] text-texto-3">Todo al día</p>
            ) : (
              lista.map((n) => (
                <Link key={n.id} href={n.href} onClick={() => setAbierto(false)} className="flex gap-3 rounded-lg px-3 py-2.5 hover:bg-hover">
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', PUNTOS[n.tono])} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-texto">{n.texto}</span>
                    <span className="block truncate text-[12.5px] text-texto-3">{n.detalle}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
