'use client'

import type { ReactNode } from 'react'

import Link from 'next/link'
import { edad } from '@/lib/utils'
import type { Animal } from '@/types'
import Avatar from '@/components/ui/Avatar'
import Etiqueta from '@/components/ui/Etiqueta'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'

type AnimalLista = Pick<Animal, 'id_animal' | 'nombre' | 'especie' | 'raza'> & Partial<Pick<Animal, 'fecha_nacimiento' | 'sexo'>>

/** Tarjetas de animales para las fichas de empresas y particulares */
export default function ListaAnimales({
  animales,
  onQuitar,
  vacio = 'Sin animales',
  extra,
  accion,
}: {
  animales: AnimalLista[]
  onQuitar?: (a: AnimalLista) => void
  vacio?: string
  extra?: (a: AnimalLista) => React.ReactNode
  accion?: ReactNode
}) {
  if (!animales.length) return <Vacio icono="animal" titulo={vacio} texto="Aquí aparecerán sus animales con su especie y su edad.">{accion}</Vacio>
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {animales.map((a) => (
        <div key={a.id_animal} className="group flex min-w-0 items-center gap-4 rounded-lg border border-borde p-4 transition-colors hover:bg-hover">
          <Avatar nombre={a.nombre} tamano="md" />
          <Link href={`/animales/${a.id_animal}`} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center">
            <p className="flex items-center gap-2 font-medium text-texto">
              {a.nombre} <Etiqueta className="h-5 px-2 text-[11.5px]">{a.especie}</Etiqueta>
            </p>
            <p className="truncate text-[12.5px] text-texto-3">
              {[a.raza, a.fecha_nacimiento ? edad(a.fecha_nacimiento) : null, a.sexo].filter(Boolean).join(' · ') || 'Sin más datos'}
            </p>
            {extra?.(a)}
          </Link>
          {onQuitar && (
            <button type="button" onClick={() => onQuitar(a)} title="Quitar de esta persona" aria-label={`Quitar a ${a.nombre}`}
              className="inline-flex size-11 items-center justify-center rounded-lg text-texto-3 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-activo hover:text-rose-700 focus:opacity-100">
              <Icono nombre="desvincular" tamano={15} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
