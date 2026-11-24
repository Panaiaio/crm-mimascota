'use client'

import { useState, type ReactNode } from 'react'
import type { Bloque, TipoBloque } from '@/lib/web/tipos'
import { descargarImagen } from '@/lib/web/datos'
import { exportarWeb, rutasImagenes } from '@/lib/web/exportar'
import { personas } from '@/lib/web/presencia'
import { cn, errorLegible } from '@/lib/utils'
import { BLOQUES, nombreBloque } from '@/components/web/bloques'
import { useAviso } from '@/hooks/useAviso'
import { useColaboracion, type Yo } from '@/hooks/useColaboracion'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import Icono from '@/components/ui/Icono'
import { useEditorWeb, type OpcionesEditor } from './useEditorWeb'
import { useUrlsImagenes } from './useUrlsImagenes'
import Avatares from './Avatares'
import BarraEditor from './BarraEditor'
import Vista from './Vista'
import MarcoBloque from './MarcoBloque'
import CatalogoBloques from './CatalogoBloques'
import PanelBloque from './PanelBloque'
import PanelAjustes from './PanelAjustes'
import PanelLateral from './PanelLateral'

type Props = Pick<OpcionesEditor, 'web' | 'bloques' | 'rol'> & {
  /** The signed-in employee (live collaboration identifies people by it) */
  yo: Yo
  onVerColaboradores?: () => void
}

/** Block editor: top bar, live preview in the centre and the fields panel on the right */
export function Editor({ yo, onVerColaboradores, ...opciones }: Props) {
  // The callbacks use `colab`, declared just below: they only run from events, after this render
  const ed = useEditorWeb({
    ...opciones,
    onSeleccionar: (s) => colab.seleccionar(s),
    onCambioContenido: (id, contenido) => colab.emitirContenido(id, contenido),
    onCambioWeb: (w) => colab.emitirWeb(w),
    onSinPermiso: (id) => colab.alPerderPermiso(id),
  })
  const colab = useColaboracion(ed, yo)
  // Someone else editing the site settings (name, palette, top bar, footer)
  const ajustesPor = colab.bloqueadoPor('ajustes')
  const { web, bloques, seleccion, guardado } = ed.estado
  const soloLectura = !ed.puedeEditar
  const { aviso } = useAviso()
  const urls = useUrlsImagenes(rutasImagenes(web, bloques))
  const [movil, setMovil] = useState(false)
  // Position where the catalogue adds the block (index in the list), null = closed
  const [anadirEn, setAnadirEn] = useState<number | null>(null)
  const [exportando, setExportando] = useState(false)

  useTituloPagina({ titulo: web.nombre.trim() || 'Web sin nombre', volver: { texto: 'Mis webs', href: '/web' } }, [web.nombre])

  const ctx = { idWeb: web.id_web, urls, soloLectura }
  const seleccionado = bloques.find((b) => b.id_bloque === seleccion)

  async function exportar() {
    setExportando(true)
    try {
      const { faltan } = await exportarWeb(web, bloques, descargarImagen)
      if (faltan.length) aviso(`Web exportada, pero sin las imágenes que no se han podido descargar de: ${faltan.join(', ')}. Vuelve a subirlas y exporta otra vez.`, 'info')
      else aviso('Web exportada. Encontrarás el archivo .zip en tus descargas.')
    } catch (e) {
      aviso(errorLegible(e), 'error')
    } finally {
      setExportando(false)
    }
  }

  function elegirBloque(tipo: TipoBloque) {
    if (anadirEn !== null) void ed.anadir(tipo, anadirEn)
    setAnadirEn(null)
  }

  const envolver = (b: Bloque, nodo: ReactNode) => {
    const i = bloques.findIndex((x) => x.id_bloque === b.id_bloque)
    return (
      <MarcoBloque
        nombre={nombreBloque(b)}
        seleccionado={b.id_bloque === seleccion}
        puedeEditar={ed.puedeEditar}
        bloqueadoPor={colab.bloqueadoPor(b.id_bloque)}
        primero={i === 0}
        ultimo={i === bloques.length - 1}
        moviendo={ed.estado.moviendo}
        onSeleccionar={() => ed.seleccionar(b.id_bloque)}
        onMover={(d) => void ed.mover(b.id_bloque, d)}
        onBorrar={() => void ed.borrar(b.id_bloque)}
        onAnadirAntes={() => setAnadirEn(i)}
      >
        {nodo}
      </MarcoBloque>
    )
  }

  const alFinal = (
    <div className="tokens-crm flex flex-col items-center gap-4 px-6 py-6 text-center font-sans">
      {bloques.length === 0 && (
        <p className="rounded-lg bg-superficie px-4 py-2 text-[14px] text-texto-2">Esta web todavía no tiene bloques.</p>
      )}
      {ed.puedeEditar && (
        <button type="button" className="btn-secundario" onClick={() => setAnadirEn(bloques.length)}>
          <Icono nombre="mas" tamano={14} /> Añadir bloque
        </button>
      )}
    </div>
  )

  const tituloPanel = seleccionado ? BLOQUES[seleccionado.tipo].nombre : 'Ajustes de la web'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BarraEditor
        nombre={web.nombre}
        onNombre={(nombre) => ed.editarWeb(() => ({ nombre }))}
        soloLectura={soloLectura}
        bloqueadoPor={ajustesPor}
        guardado={guardado}
        avatares={<Avatares personas={personas(colab.presentes, yo.id_empleado)} yo={yo.id_empleado} />}
        onVerColaboradores={onVerColaboradores}
        onExportar={() => void exportar()}
        exportando={exportando}
      />
      <div className="flex min-h-0 flex-1">
        <section aria-label="Vista previa de la web" className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-borde px-4 py-2 sm:px-6">
            <div className="inline-flex rounded-lg border border-borde bg-superficie" role="group" aria-label="Ancho de la vista previa">
              {[false, true].map((m) => (
                <button
                  key={String(m)}
                  type="button"
                  aria-pressed={movil === m}
                  onClick={() => setMovil(m)}
                  className={cn('inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-4 text-[14px]', movil === m ? 'bg-activo text-texto' : 'text-texto-3 hover:text-texto')}
                >
                  <Icono nombre={m ? 'telefono' : 'panel'} tamano={15} /> {m ? 'Móvil' : 'Ordenador'}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn-fantasma ml-auto"
              aria-pressed={seleccion === 'ajustes'}
              aria-disabled={!!ajustesPor || undefined}
              title={ajustesPor ? `Lo está editando ${ajustesPor}` : undefined}
              onClick={() => ed.seleccionar('ajustes')}
            >
              <Icono nombre="ajustes" tamano={15} /> Ajustes de la web
            </button>
          </div>
          <Vista web={web} bloques={bloques} urls={urls} movil={movil} envolver={envolver} alFinal={alFinal} />
        </section>

        <PanelLateral titulo={tituloPanel} abierto={seleccion !== null} cerrable={!!seleccionado} onCerrar={() => ed.seleccionar(null)}>
          {soloLectura && <p className="mx-6 mt-6 text-[13px] text-texto-3">Solo puedes ver esta web: los campos no se pueden cambiar.</p>}
          {seleccionado ? (
            <PanelBloque key={seleccionado.id_bloque} bloque={seleccionado} ctx={ctx} onCambiar={(f) => ed.editarBloque(seleccionado.id_bloque, f)} />
          ) : (
            // Shown when nothing is selected too, but using it selects "ajustes" first (live collaboration locks it)
            <div onFocusCapture={() => ed.puedeEditar && !ajustesPor && ed.seleccionar('ajustes')}>
              {ajustesPor && !soloLectura && (
                <p className="mx-6 mt-6 flex items-center gap-2 text-[13px] text-texto-3">
                  <Icono nombre="candado" tamano={14} /> Lo está editando {ajustesPor}. Podrás cambiarlo cuando termine.
                </p>
              )}
              <PanelAjustes web={web} ctx={{ ...ctx, soloLectura: soloLectura || !!ajustesPor }} onCambiar={ed.editarWeb} />
            </div>
          )}
        </PanelLateral>
      </div>

      <CatalogoBloques abierto={anadirEn !== null} onCerrar={() => setAnadirEn(null)} onElegir={elegirBloque} />
    </div>
  )
}
