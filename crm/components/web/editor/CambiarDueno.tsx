import { useState } from 'react'
import { errorLegible, nombreCompleto } from '@/lib/utils'
import { cambiarDueno } from '@/lib/web/datos'
import { useAviso } from '@/hooks/useAviso'
import Campo from '@/components/ui/Campo'

type Empleado = { id_empleado: string; nombre: string; apellidos: string | null }

/** Admin only: hands the site to another active employee */
export default function CambiarDueno({
  idWeb,
  empleados,
  duenoActual,
  nombreDueno,
  onCambiado,
}: {
  idWeb: string
  /** Active employees, admins included */
  empleados: Empleado[]
  duenoActual: string
  nombreDueno: string
  onCambiado: (idNuevo: string) => void
}) {
  const { aviso, confirmar } = useAviso()
  const [nuevo, setNuevo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const opciones = empleados.filter((e) => e.id_empleado !== duenoActual)

  async function cambiar() {
    const elegido = opciones.find((e) => e.id_empleado === nuevo)
    if (!elegido) return
    const nombre = nombreCompleto(elegido)
    const ok = await confirmar({
      titulo: `Cambiar el dueño a ${nombre}`,
      texto: `${nombreDueno || 'El dueño actual'} dejará de tener acceso; puedes volver a añadirle como colaborador.`,
      boton: 'Cambiar dueño',
    })
    if (!ok) return
    setOcupado(true)
    try {
      await cambiarDueno(idWeb, elegido.id_empleado)
      aviso(`${nombre} es ahora el dueño de la web.`)
      onCambiado(elegido.id_empleado)
    } catch (e) {
      aviso(errorLegible(e), 'error')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section aria-labelledby="titulo-dueno" className="border-t border-borde px-6 py-4">
      <h3 id="titulo-dueno" className="text-[14px] font-semibold text-texto">Cambiar dueño</h3>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <Campo etiqueta="Nuevo dueño" className="w-full min-w-0 sm:w-64">
          <select className="input" value={nuevo} onChange={(e) => setNuevo(e.target.value)}>
            <option value="">Elige un empleado</option>
            {opciones.map((e) => <option key={e.id_empleado} value={e.id_empleado}>{nombreCompleto(e)}</option>)}
          </select>
        </Campo>
        <button type="button" className="btn-secundario" disabled={!nuevo || ocupado} onClick={() => void cambiar()}>Cambiar dueño</button>
      </div>
    </section>
  )
}
