'use client'

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn, normalizar } from '@/lib/utils'
import Icono from './Icono'

export interface OpcionBuscable {
  id: string
  texto: string
  detalle?: string
}

/** Pone en negrita la parte del texto que coincide con lo escrito */
function Resaltado({ texto, busqueda }: { texto: string; busqueda: string }): ReactNode {
  const q = normalizar(busqueda)
  const i = q ? normalizar(texto).indexOf(q) : -1
  if (i < 0) return texto
  return <>{texto.slice(0, i)}<b className="font-semibold text-texto">{texto.slice(i, i + q.length)}</b>{texto.slice(i + q.length)}</>
}

/**
 * Buscador con sugerencias para listas largas (más de diez opciones):
 * al escribir muestra las coincidencias con la parte encontrada en negrita
 * y, al final, la opción de crear uno nuevo sin salir del formulario.
 */
export default function SelectorBuscable({
  valor,
  opciones,
  onChange,
  ayuda = 'Escribe para buscar…',
  textoCrear,
  onCrear,
  invalido,
  maximo = 8,
}: {
  valor: string
  opciones: OpcionBuscable[]
  onChange: (id: string) => void
  ayuda?: string
  /** "Crear particular" */
  textoCrear?: string
  onCrear?: (texto: string) => void
  invalido?: boolean
  maximo?: number
}) {
  const idLista = useId()
  const elegida = opciones.find((o) => o.id === valor)
  const [texto, setTexto] = useState(elegida?.texto ?? '')
  const [abierto, setAbierto] = useState(false)
  const [activa, setActiva] = useState(0)
  const caja = useRef<HTMLDivElement>(null)

  // Si cambia la opción elegida desde fuera (p. ej. al crear una nueva), se muestra su nombre
  useEffect(() => { setTexto(elegida?.texto ?? '') }, [elegida?.texto])

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) { setAbierto(false); setTexto(elegida?.texto ?? '') } }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto, elegida?.texto])

  const buscando = texto !== (elegida?.texto ?? '') ? texto : ''
  const resultados = useMemo(() => {
    const q = normalizar(buscando)
    const lista = q ? opciones.filter((o) => normalizar(`${o.texto} ${o.detalle ?? ''}`).includes(q)) : opciones
    return lista.slice(0, maximo)
  }, [opciones, buscando, maximo])
  const total = resultados.length + (onCrear ? 1 : 0)

  function elegir(i: number) {
    if (i < resultados.length) {
      onChange(resultados[i].id)
      setTexto(resultados[i].texto)
    } else if (onCrear) {
      onCrear(buscando.trim())
    }
    setAbierto(false)
  }

  return (
    <div ref={caja} className="relative">
      <div className={cn('marco-campo input flex items-center gap-2 !px-0 focus-within:border-primario focus-within:ring-3 focus-within:ring-[var(--anillo)]', invalido && 'border-rose-600')}>
        <Icono nombre="buscar" tamano={15} className="ml-4 shrink-0 text-texto-3" />
        <input
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-invalid={invalido || undefined}
          value={texto}
          placeholder={ayuda}
          onFocus={() => setAbierto(true)}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActiva(0); if (!e.target.value) onChange('') }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActiva((a) => Math.min(a + 1, total - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActiva((a) => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter' && abierto && total) { e.preventDefault(); elegir(activa) }
            else if (e.key === 'Escape' && abierto) { e.stopPropagation(); setAbierto(false); setTexto(elegida?.texto ?? '') }
          }}
          className="-my-px h-11 min-w-0 flex-1 bg-transparent pr-4 outline-none placeholder:text-texto-3"
        />
      </div>
      {abierto && (
        <ul id={idLista} role="listbox" className="absolute top-full right-0 left-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-borde bg-superficie p-2 shadow-[var(--sombra)]">
          {resultados.map((o, i) => (
            <li key={o.id} role="option" aria-selected={o.id === valor}
              onMouseDown={(e) => { e.preventDefault(); elegir(i) }} onMouseEnter={() => setActiva(i)}
              className={cn('flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg px-4 text-[14px] text-texto-2', i === activa && 'bg-hover')}>
              <span className="truncate"><Resaltado texto={o.texto} busqueda={buscando} /></span>
              {o.detalle && <span className="shrink-0 text-[12.5px] text-texto-3">{o.detalle}</span>}
            </li>
          ))}
          {!resultados.length && <li className="flex min-h-11 items-center px-4 text-[13px] text-texto-3">Ninguna coincidencia con «{buscando}»</li>}
          {onCrear && (
            <li role="option" aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); elegir(resultados.length) }} onMouseEnter={() => setActiva(resultados.length)}
              className={cn('mt-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-t border-borde px-4 text-[14px] font-medium text-texto', activa === resultados.length && 'bg-hover')}>
              <Icono nombre="mas" tamano={15} /> {textoCrear}{buscando.trim() ? ` «${buscando.trim()}»` : ''}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
