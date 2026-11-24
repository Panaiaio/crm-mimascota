'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { cargarWeb, SIN_ACCESO } from '@/lib/web/datos'
import { useConsulta } from '@/hooks/useConsulta'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import Vacio from '@/components/ui/Vacio'
import { BloqueCargando, ErrorCarga } from '@/components/ui/Cargando'
import { Editor } from '@/components/web/editor/Editor'

export default function EditorWebPage() {
  const { id } = useParams<{ id: string }>()
  const { datos, cargando, error, recargar } = useConsulta(() => cargarWeb(id), [id])

  // The editor replaces this title with the site name once it is loaded
  useTituloPagina({ titulo: 'Web', volver: { texto: 'Mis webs', href: '/web' } })

  if (error === SIN_ACCESO) {
    return (
      <Vacio icono="candado" titulo={SIN_ACCESO} texto="Puede que la hayan borrado o que su dueño te haya quitado. Pídele que te invite otra vez.">
        <Link href="/web" className="btn-secundario">Volver a Mis webs</Link>
      </Vacio>
    )
  }
  if (error) return <ErrorCarga mensaje={error} reintentar={recargar} />
  if (cargando || !datos) return <div className="p-4 sm:p-6"><BloqueCargando alto={320} /></div>

  return <Editor key={id} web={datos.web} bloques={datos.bloques} rol={datos.rol} />
}
