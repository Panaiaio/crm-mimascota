'use client'

import type { CampoBloque } from '@/lib/web/tipos'
import { insertarItem, itemVacio, moverItem, quitarItem } from '@/lib/web/listas'
import { comoLista, comoTexto, enlaceSeguro } from '@/components/web/bloques/util'
import { useAviso } from '@/hooks/useAviso'
import Campo from '@/components/ui/Campo'
import Icono from '@/components/ui/Icono'
import ImagenControl, { type ContextoCampos } from './ImagenControl'

type Contenido = Record<string, unknown>
/** Updaters receive the latest value, so late calls (uploads, "Deshacer") never undo newer edits */
type Actualizar<T> = (f: (actual: T) => T) => void

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const ERROR_ALT = 'Describe la imagen para quien no puede verla.'
const AYUDA_ENLACE = 'Empieza por https://, mailto: o tel:'

/**
 * The form for a group of block fields (a whole block, or one list item).
 * The `alt` field is the companion of the group's image: required once there is an image.
 */
export function CamposBloque({ campos, contenido, onCambiar, ctx }: {
  campos: CampoBloque[]
  contenido: Contenido
  onCambiar: Actualizar<Contenido>
  ctx: ContextoCampos
}) {
  const imagen = campos.find((c) => c.tipo === 'imagen')
  const hayImagen = !!imagen && comoTexto(contenido[imagen.clave]) !== ''
  return (
    <div className="space-y-4">
      {campos.map((c) => {
        const esAlt = !!imagen && c.clave === 'alt'
        return (
          <CampoBloqueControl
            key={c.clave}
            campo={c}
            valor={contenido[c.clave]}
            onCambiar={(f) => onCambiar((actual) => ({ ...actual, [c.clave]: f(actual[c.clave]) }))}
            ctx={ctx}
            obligatorio={c.obligatorio || (esAlt && hayImagen)}
            ayuda={esAlt && !hayImagen ? 'Hace falta en cuanto pongas una imagen.' : undefined}
            error={esAlt && hayImagen && comoTexto(contenido.alt).trim() === '' ? ERROR_ALT : undefined}
          />
        )
      })}
    </div>
  )
}

function CampoBloqueControl({ campo, valor, onCambiar, ctx, obligatorio, ayuda, error }: {
  campo: CampoBloque
  valor: unknown
  onCambiar: Actualizar<unknown>
  ctx: ContextoCampos
  obligatorio?: boolean
  ayuda?: string
  error?: string
}) {
  const texto = comoTexto(valor)
  const comun = { className: 'input', value: texto, maxLength: campo.max, readOnly: ctx.soloLectura }

  switch (campo.tipo) {
    case 'texto':
      return (
        <Campo etiqueta={campo.etiqueta} obligatorio={obligatorio} ayuda={ayuda} error={error}>
          <input {...comun} onChange={(e) => onCambiar(() => e.target.value)} />
        </Campo>
      )
    case 'textoLargo':
      return (
        <Campo etiqueta={campo.etiqueta} obligatorio={obligatorio} ayuda={ayuda} error={error}>
          <textarea {...comun} rows={4} onChange={(e) => onCambiar(() => e.target.value)} />
        </Campo>
      )
    case 'enlace':
      return (
        <Campo
          etiqueta={campo.etiqueta}
          obligatorio={obligatorio}
          ayuda={AYUDA_ENLACE}
          error={texto.trim() && !enlaceSeguro(texto) ? `Este enlace no se puede usar. ${AYUDA_ENLACE}.` : error}
        >
          <input {...comun} inputMode="url" autoComplete="off" spellCheck={false} placeholder="https://" onChange={(e) => onCambiar(() => e.target.value)} />
        </Campo>
      )
    case 'imagen':
      return <ImagenControl etiqueta={campo.etiqueta} ruta={texto} obligatorio={obligatorio} ctx={ctx} onCambiar={(ruta) => onCambiar(() => ruta)} />
    case 'lista':
      return <ListaControl campo={campo} valor={valor} onCambiar={onCambiar} ctx={ctx} />
  }
}

/** Repeatable items: add, remove (with "Deshacer") and move up/down */
function ListaControl({ campo, valor, onCambiar, ctx }: {
  campo: CampoBloque
  valor: unknown
  onCambiar: Actualizar<unknown>
  ctx: ContextoCampos
}) {
  const { aviso } = useAviso()
  const items = comoLista(valor)
  const subcampos = campo.campos ?? []
  const elemento = campo.elemento ?? 'elemento'
  const lleno = campo.max !== undefined && items.length >= campo.max
  const cambiarLista = (f: (l: Contenido[]) => Contenido[]) => onCambiar((actual) => f(comoLista(actual)))

  function quitar(i: number) {
    const quitado = items[i]
    // The first text the item has names it in the message ("Se ha quitado «Primer servicio»")
    const resumen = subcampos
      .filter((c) => c.tipo === 'texto' || c.tipo === 'textoLargo')
      .map((c) => comoTexto(quitado[c.clave]).trim())
      .find(Boolean)
    cambiarLista((l) => quitarItem(l, i))
    aviso(`Se ha quitado «${resumen ?? `${elemento} ${i + 1}`}»`, 'info', {
      deshacer: () => cambiarLista((l) => insertarItem(l, i, quitado)),
    })
  }

  return (
    <fieldset>
      <legend className="label">{campo.etiqueta}</legend>
      {items.length === 0 && <p className="text-[13px] text-texto-3">La lista está vacía.</p>}
      <ol className="space-y-4">
        {items.map((it, i) => {
          const nombre = `${elemento} ${i + 1}`
          return (
            <li key={i} className="rounded-xl border border-borde p-4">
              <div className="mb-4 flex items-center gap-2">
                <h3 className="mr-auto text-[13px] font-medium text-texto">{mayuscula(nombre)}</h3>
                {!ctx.soloLectura && (
                  <>
                    <button type="button" className="btn-icono" disabled={i === 0} onClick={() => cambiarLista((l) => moverItem(l, i, -1))} aria-label={`Subir ${nombre}`}>
                      <Icono nombre="arriba" tamano={16} />
                    </button>
                    <button type="button" className="btn-icono" disabled={i === items.length - 1} onClick={() => cambiarLista((l) => moverItem(l, i, 1))} aria-label={`Bajar ${nombre}`}>
                      <Icono nombre="abajo" tamano={16} />
                    </button>
                    <button type="button" className="btn-icono" onClick={() => quitar(i)} aria-label={`Quitar ${nombre}`}>
                      <Icono nombre="papelera" tamano={16} />
                    </button>
                  </>
                )}
              </div>
              <CamposBloque
                campos={subcampos}
                contenido={it}
                onCambiar={(f) => cambiarLista((l) => l.map((x, k) => (k === i ? f(x) : x)))}
                ctx={ctx}
              />
            </li>
          )
        })}
      </ol>
      {!ctx.soloLectura && (
        <div className="mt-4">
          <button type="button" className="btn-secundario" disabled={lleno} onClick={() => cambiarLista((l) => [...l, itemVacio(subcampos)])}>
            <Icono nombre="mas" tamano={14} /> Añadir {elemento}
          </button>
          {lleno && <p className="mt-2 text-[12.5px] text-texto-3">Has llegado al máximo de {campo.max}. Quita uno para añadir otro.</p>}
        </div>
      )}
    </fieldset>
  )
}
