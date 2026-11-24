'use client'

import type { Ajustes, Web } from '@/lib/web/tipos'
import { MAX_NOMBRE } from '@/lib/web/limites'
import Campo from '@/components/ui/Campo'
import SelectorPaleta from '@/components/web/SelectorPaleta'
import ImagenControl, { type ContextoCampos } from './ImagenControl'
import type { CambiosWeb } from './useEditorWeb'

/** "Ajustes de la web": name, top bar, footer, search description and palette */
export default function PanelAjustes({ web, onCambiar, ctx }: {
  web: Web
  onCambiar: (actualizar: (w: Web) => CambiosWeb) => void
  ctx: ContextoCampos
}) {
  const ajuste = (clave: keyof Omit<Ajustes, 'logo'>) => ({
    className: 'input',
    value: web.ajustes[clave],
    readOnly: ctx.soloLectura,
    onChange: (e: { target: { value: string } }) => {
      const valor = e.target.value
      onCambiar((w) => ({ ajustes: { ...w.ajustes, [clave]: valor } }))
    },
  })

  return (
    <div className="space-y-4 px-6 py-6">
      {/* Same field as in the top bar, which shows the error when it is empty */}
      <Campo etiqueta="Nombre de la web" obligatorio ayuda="Lo ves en el CRM y da nombre al archivo exportado.">
        <input
          className="input"
          value={web.nombre}
          maxLength={MAX_NOMBRE}
          readOnly={ctx.soloLectura}
          onChange={(e) => {
            const nombre = e.target.value
            onCambiar(() => ({ nombre }))
          }}
        />
      </Campo>
      <Campo etiqueta="Título" ayuda="Sale arriba en la web. Si lo dejas vacío se usa el nombre.">
        <input {...ajuste('titulo')} maxLength={80} />
      </Campo>
      <ImagenControl
        etiqueta="Logo"
        ruta={web.ajustes.logo ?? ''}
        ctx={ctx}
        onCambiar={(ruta) => onCambiar((w) => ({ ajustes: { ...w.ajustes, logo: ruta || null } }))}
      />
      <Campo etiqueta="Descripción para buscadores" ayuda="Una o dos frases sobre la web. No se ve en la página.">
        <textarea {...ajuste('descripcion')} rows={3} maxLength={160} />
      </Campo>
      <Campo etiqueta="Pie de página" ayuda="Texto corto al final de la web, por ejemplo el nombre y el año.">
        <input {...ajuste('pie')} maxLength={200} />
      </Campo>
      {!ctx.soloLectura && <SelectorPaleta valor={web.paleta} onCambiar={(paleta) => onCambiar(() => ({ paleta }))} />}
    </div>
  )
}
