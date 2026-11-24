import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { errorLegible } from '@/lib/utils'
import { borrarWeb } from '@/lib/web/datos'
import { useAviso } from '@/hooks/useAviso'
import Icono from '@/components/ui/Icono'

/** Owner or admin only: deletes the site for everyone and goes back to "Mis webs" */
export default function EliminarWeb({
  idWeb,
  nombre,
  onEliminando,
  onNoEliminada,
}: {
  idWeb: string
  nombre: string
  /** Just before deleting: the editor stops saving and ignores the Realtime delete of its own site */
  onEliminando: () => void
  /** The delete failed: the editor carries on */
  onNoEliminada: () => void
}) {
  const { aviso, confirmar } = useAviso()
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)

  async function eliminar() {
    const ok = await confirmar({
      titulo: `Eliminar la web «${nombre}»`,
      texto: 'Se borrarán sus bloques, sus imágenes y sus colaboradores para todas las personas.',
      boton: 'Eliminar web',
      peligro: true,
    })
    if (!ok) return
    setOcupado(true)
    onEliminando()
    try {
      await borrarWeb(idWeb)
      aviso(`Web «${nombre}» eliminada`, 'exito')
      router.push('/web')
    } catch (e) {
      onNoEliminada()
      aviso(errorLegible(e), 'error')
      setOcupado(false)
    }
  }

  return (
    <section aria-labelledby="titulo-eliminar-web" className="border-t border-borde px-6 py-4">
      <h3 id="titulo-eliminar-web" className="text-[14px] font-semibold text-texto">Eliminar web</h3>
      <p className="mt-1 text-[13px] text-texto-3">Desaparece para todas las personas que la ven o la editan.</p>
      <button type="button" className="btn-peligro mt-2" disabled={ocupado} onClick={() => void eliminar()}>
        <Icono nombre="papelera" tamano={14} /> {ocupado ? 'Eliminando…' : 'Eliminar web'}
      </button>
    </section>
  )
}
