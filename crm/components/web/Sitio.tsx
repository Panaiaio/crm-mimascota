/* eslint-disable @next/next/no-img-element -- plain <img> is required: the same markup is exported as static HTML */
import { Fragment, type ReactNode } from 'react'
import type { Bloque, ResolverImagen, Web } from '@/lib/web/tipos'
import { BLOQUES } from './bloques'

type Props = {
  web: Pick<Web, 'nombre' | 'ajustes'>
  bloques: Bloque[]
  imagen: ResolverImagen
  /** Editor only: wraps each block (e.g. with its outline and actions) */
  envolver?: (bloque: Bloque, nodo: ReactNode) => ReactNode
  /** Editor only: empty blocks show a placeholder instead of being skipped */
  conVacios?: boolean
  /** Editor only: rendered at the end of <main> (e.g. "+ Añadir bloque") */
  alFinal?: ReactNode
}

// Pure presentational component: used by the editor preview and by the static HTML export.
export function Sitio({ web, bloques, imagen, envolver, conVacios, alFinal }: Props) {
  const titulo = web.ajustes.titulo || web.nombre
  const ordenados = [...bloques].sort((a, b) => a.orden - b.orden)
  const visibles = ordenados.filter((b) => !BLOQUES[b.tipo].vacio(b.contenido))
  const menu = visibles.flatMap((b) => {
    const t = b.contenido.titulo
    return typeof t === 'string' && t.trim() !== '' ? [{ id: b.id_bloque, titulo: t }] : []
  })

  return (
    <div className="sitio">
      <header className="sitio-barra">
        <div className="sitio-marca">
          {web.ajustes.logo && <img src={imagen(web.ajustes.logo)} alt="" />}
          <h1>{titulo}</h1>
        </div>
        {menu.length > 0 && (
          <nav aria-label="Secciones">
            <ul>
              {menu.map((m) => (
                <li key={m.id}><a href={`#${m.id}`}>{m.titulo}</a></li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main>
        {(conVacios ? ordenados : visibles).map((b) => {
          const def = BLOQUES[b.tipo]
          const nodo = def.vacio(b.contenido) ? (
            <p className="sitio-vacio">Bloque vacío: {def.nombre}. Rellénalo en el panel.</p>
          ) : (
            <def.Componente id={b.id_bloque} contenido={b.contenido} imagen={imagen} />
          )
          return <Fragment key={b.id_bloque}>{envolver ? envolver(b, nodo) : nodo}</Fragment>
        })}
        {alFinal}
      </main>
      {web.ajustes.pie && (
        <footer className="sitio-pie">
          <p>{web.ajustes.pie}</p>
        </footer>
      )}
    </div>
  )
}
