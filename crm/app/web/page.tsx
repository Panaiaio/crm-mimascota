'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { listarWebs } from '@/lib/web/datos'
import { normalizar } from '@/lib/utils'
import { useConsulta } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import BuscadorPastilla from '@/components/ui/BuscadorPastilla'
import Icono from '@/components/ui/Icono'
import Vacio from '@/components/ui/Vacio'
import { BloqueCargando, ErrorCarga } from '@/components/ui/Cargando'
import TarjetaWeb from '@/components/web/TarjetaWeb'

const VACIOS: Record<string, { titulo: string; texto: string }> = {
  mias: { titulo: 'Todavía no has creado ninguna web', texto: 'Crea tu primera web a partir de una plantilla y edítala con bloques.' },
  ajenas: { titulo: 'No hay webs de otras personas', texto: 'Aquí aparecerán las webs que otras personas comparten contigo.' },
  todas: { titulo: 'Todavía no hay webs', texto: 'Crea tu primera web a partir de una plantilla y edítala con bloques.' },
}

export default function WebsPage() {
  const { empleado, esAdmin } = useSesion()
  const miId = empleado?.id_empleado ?? null
  const [pestana, setPestana] = useState('mias')
  const [texto, setTexto] = useState('')

  useTituloPagina({ titulo: 'Mis webs' })

  const { datos, cargando, error, recargar } = useConsulta(
    async () => (miId ? listarWebs({ id_empleado: miId, esAdmin }) : []),
    [miId, esAdmin],
  )
  const webs = useMemo(() => datos ?? [], [datos])

  if (!miId) {
    return (
      <Vacio icono="web" titulo="Tu correo no tiene ficha de empleado" texto="Para crear y ver webs, un administrador tiene que crear tu ficha de empleado con el mismo correo con el que has entrado." />
    )
  }

  const mias = webs.filter((w) => w.id_dueno_fk === miId)
  const lista = pestana === 'mias' ? mias : pestana === 'ajenas' ? webs.filter((w) => w.id_dueno_fk !== miId) : webs
  const visibles = texto ? lista.filter((w) => normalizar(w.nombre).includes(normalizar(texto))) : lista

  // The empty state repeats it as a secondary button: one primary button per screen
  const nueva = (clase: string) => (
    <Link href="/web/nueva" className={clase}><Icono nombre="mas" tamano={14} /> Nueva web</Link>
  )

  return (
    <div className="flex h-full flex-col">
      <Pestanas
        activa={pestana}
        onCambiar={setPestana}
        pestanas={[
          { id: 'mias', texto: 'Mías', contador: mias.length },
          { id: 'ajenas', texto: 'Ajenas', contador: webs.length - mias.length },
          { id: 'todas', texto: 'Todas', contador: webs.length },
        ]}
      />
      <BarraFiltros
        filtros={lista.length > 10 || texto ? <BuscadorPastilla valor={texto} onChange={setTexto} ayuda="nombre de la web" /> : undefined}
        acciones={nueva('btn-primario')}
      />
      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : (
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto border-t border-borde p-4 sm:p-6">
          {cargando && !datos ? (
            <BloqueCargando alto={160} />
          ) : visibles.length ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(256px,1fr))] gap-4">
              {visibles.map((w) => (
                <li key={w.id_web}><TarjetaWeb web={w} miId={miId} /></li>
              ))}
            </ul>
          ) : (
            <Vacio
              icono="web"
              titulo={texto ? 'Ninguna web con esa búsqueda' : VACIOS[pestana].titulo}
              texto={texto ? 'Prueba con otra palabra o borra la búsqueda.' : VACIOS[pestana].texto}
            >
              {texto
                ? <button type="button" className="btn-secundario" onClick={() => setTexto('')}>Borrar búsqueda</button>
                : nueva('btn-secundario')}
            </Vacio>
          )}
        </div>
      )}
    </div>
  )
}
