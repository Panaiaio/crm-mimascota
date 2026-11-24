/* eslint-disable @next/next/no-img-element -- plain <img> is required: the same markup is exported as static HTML */
import type { Bloque, ResolverImagen, Web } from '@/lib/web/tipos'
import { BLOQUES } from './bloques'

type Props = {
  web: Pick<Web, 'nombre' | 'ajustes'>
  bloques: Bloque[]
  imagen: ResolverImagen
}

// Pure presentational component: used by the editor preview and by the static HTML export.
export function Sitio({ web, bloques, imagen }: Props) {
  const titulo = web.ajustes.titulo || web.nombre
  const visibles = [...bloques]
    .sort((a, b) => a.orden - b.orden)
    .filter((b) => !BLOQUES[b.tipo].vacio(b.contenido))
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
        {visibles.map((b) => {
          const { Componente } = BLOQUES[b.tipo]
          return <Componente key={b.id_bloque} id={b.id_bloque} contenido={b.contenido} imagen={imagen} />
        })}
      </main>
      {web.ajustes.pie && (
        <footer className="sitio-pie">
          <p>{web.ajustes.pie}</p>
        </footer>
      )}
    </div>
  )
}
