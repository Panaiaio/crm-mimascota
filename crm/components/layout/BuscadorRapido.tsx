'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { estadoInfo, tonoDeTexto } from '@/lib/crm-utils'
import { cn, formatEUR, nombreCompleto } from '@/lib/utils'
import type { Estado, Tono } from '@/types'
import Icono from '@/components/ui/Icono'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'

interface Resultado {
  id: string
  href: string
  titulo: string
  tipo: string
  detalle: string
  etiqueta?: { texto: string; tono: Tono }
  foto?: string | null
  cuadrado?: boolean
}

/** Búsqueda rápida (Ctrl + K) en empresas, particulares, animales, oportunidades y empleados */
export default function BuscadorRapido({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const router = useRouter()
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [marcado, setMarcado] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (abierto) {
      setTexto('')
      setResultados([])
      requestAnimationFrame(() => input.current?.focus())
    }
  }, [abierto])

  useEffect(() => {
    const q = texto.trim().replace(/[%,()]/g, ' ')
    if (q.length < 2) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      const sb = createClient()
      const like = `%${q}%`
      const [emp, par, ani, opo, tra] = await Promise.all([
        sb.from('empresa').select('id_empresa, nombre, logo, sector, ciudad').or(`nombre.ilike.${like},ciudad.ilike.${like},sector.ilike.${like}`).limit(5),
        sb.from('particular').select('id_particular, nombre, apellidos, correo, telefono').or(`nombre.ilike.${like},apellidos.ilike.${like},correo.ilike.${like},telefono.ilike.${like}`).limit(5),
        sb.from('animal').select('id_animal, nombre, especie, raza').or(`nombre.ilike.${like},especie.ilike.${like},raza.ilike.${like},microchip.ilike.${like}`).limit(5),
        sb.from('oportunidad').select('id_oportunidad, titulo, estado, valor').or(`titulo.ilike.${like},nombre_contacto.ilike.${like}`).order('fecha_creacion', { ascending: false }).limit(5),
        sb.from('empleado').select('id_empleado, nombre, apellidos, puesto, foto').or(`nombre.ilike.${like},apellidos.ilike.${like},puesto.ilike.${like}`).limit(5),
      ])
      const r: Resultado[] = [
        ...(emp.data ?? []).map((e) => ({ id: e.id_empresa, href: `/empresas/${e.id_empresa}`, titulo: e.nombre, tipo: 'Empresa', detalle: e.ciudad ?? '', foto: e.logo, cuadrado: true, etiqueta: e.sector ? { texto: e.sector, tono: tonoDeTexto(e.sector) } : undefined })),
        ...(par.data ?? []).map((p) => ({ id: p.id_particular, href: `/particulares/${p.id_particular}`, titulo: nombreCompleto(p), tipo: 'Particular', detalle: p.correo ?? p.telefono ?? '' })),
        ...(ani.data ?? []).map((a) => ({ id: a.id_animal, href: `/animales/${a.id_animal}`, titulo: a.nombre, tipo: 'Animal', detalle: a.raza ?? '', etiqueta: { texto: a.especie, tono: tonoDeTexto(a.especie) } })),
        ...(opo.data ?? []).map((o) => ({ id: o.id_oportunidad, href: `/oportunidades/${o.id_oportunidad}`, titulo: o.titulo, tipo: 'Oportunidad', detalle: formatEUR(o.valor), etiqueta: { texto: estadoInfo(o.estado as Estado).texto, tono: estadoInfo(o.estado as Estado).tono } })),
        ...(tra.data ?? []).map((e) => ({ id: e.id_empleado, href: `/rrhh/empleados/${e.id_empleado}`, titulo: nombreCompleto(e), tipo: 'Empleado', detalle: e.puesto, foto: e.foto })),
      ]
      setResultados(r)
      setMarcado(0)
      setBuscando(false)
    }, 200)
    return () => clearTimeout(t)
  }, [texto])

  function abrir(r: Resultado | undefined) {
    if (!r) return
    onCerrar()
    router.push(r.href)
  }

  function tecla(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setMarcado((m) => Math.min(resultados.length - 1, m + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setMarcado((m) => Math.max(0, m - 1)) }
    if (e.key === 'Enter') abrir(resultados[marcado])
    if (e.key === 'Escape') onCerrar()
  }

  if (!abierto) return null

  return (
    <div className="animar-aparecer fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={onCerrar}>
      <div className="animar-subir w-full max-w-2xl overflow-hidden rounded-2xl border border-borde bg-superficie shadow-[var(--sombra)]" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-borde px-4">
          <Icono nombre="buscar" className="text-texto-3" />
          <input
            ref={input}
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={tecla}
            placeholder="Buscar empresas, particulares, animales, oportunidades, empleados…"
            className="h-13 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-texto-3"
          />
          <span className="kbd">Esc</span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {texto.trim().length < 2 ? (
            <p className="px-3 py-8 text-center text-[13px] text-texto-3">Escribe al menos 2 letras</p>
          ) : !buscando && !resultados.length ? (
            <p className="px-3 py-8 text-center text-[13px] text-texto-3">Sin resultados para «{texto}»</p>
          ) : (
            resultados.map((r, i) => (
              <button
                key={r.tipo + r.id}
                type="button"
                onMouseEnter={() => setMarcado(i)}
                onClick={() => abrir(r)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left', i === marcado && 'bg-hover')}
              >
                <Avatar nombre={r.titulo} foto={r.foto} cuadrado={r.cuadrado} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-texto">{r.titulo}</span>
                {r.etiqueta && <Etiqueta tono={r.etiqueta.tono}>{r.etiqueta.texto}</Etiqueta>}
                <span className="hidden w-40 truncate text-right text-[12.5px] text-texto-3 sm:block">{r.detalle}</span>
                <span className="w-24 text-right text-[12px] text-texto-3">{r.tipo}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-borde px-4 py-2.5 text-[12px] text-texto-3">
          <span className="flex items-center gap-1.5"><span className="kbd"><Icono nombre="arriba" tamano={11} /></span><span className="kbd"><Icono nombre="abajo" tamano={11} /></span> Navegar</span>
          <span className="flex items-center gap-1.5"><span className="kbd">↵</span> Abrir</span>
        </div>
      </div>
    </div>
  )
}
