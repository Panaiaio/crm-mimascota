'use client'

import { useMemo, useState } from 'react'
import { MESES } from '@/lib/rrhh-utils'
import { nombreCompleto } from '@/lib/utils'
import { useConsulta, sinError } from '@/hooks/useConsulta'
import { useSesion } from '@/hooks/useSesion'
import { useCatalogos } from '@/hooks/useCatalogos'
import { useTituloPagina } from '@/hooks/useTituloPagina'
import type { Nomina } from '@/types'
import Pestanas from '@/components/ui/Pestanas'
import BarraFiltros from '@/components/ui/BarraFiltros'
import FiltroPastilla from '@/components/ui/FiltroPastilla'
import Etiqueta from '@/components/ui/Etiqueta'
import Icono from '@/components/ui/Icono'
import PieTabla from '@/components/ui/PieTabla'
import { ErrorCarga, BloqueCargando } from '@/components/ui/Cargando'
import ListaNominas from '@/components/rrhh/ListaNominas'
import FormNomina from '@/components/rrhh/FormNomina'

export default function NominasPage() {
  const { empleado, esAdmin } = useSesion()
  const { empleados } = useCatalogos()
  const [pestana, setPestana] = useState(esAdmin ? 'todas' : 'mias')
  const [quien, setQuien] = useState('todos')
  const [anio, setAnio] = useState('todos')
  const [estado, setEstado] = useState('todas')
  const [subiendo, setSubiendo] = useState(false)

  const { datos, cargando, error, recargar } = useConsulta(async (sb) =>
    sinError(await sb.from('nomina').select('*, empleado(id_empleado, nombre, apellidos, foto)').order('anio', { ascending: false }).order('mes', { ascending: false })) as Nomina[], [])

  const todas = useMemo(() => datos ?? [], [datos])
  const mias = todas.filter((n) => n.id_empleado_fk === empleado?.id_empleado)
  const base = pestana === 'mias' ? mias : todas
  const visibles = base.filter((n) =>
    (pestana === 'mias' || quien === 'todos' || n.id_empleado_fk === quien) &&
    (anio === 'todos' || String(n.anio) === anio) &&
    (estado === 'todas' || (estado === 'firmadas' ? n.firmada : !n.firmada)),
  )
  const sinFirmar = mias.filter((n) => !n.firmada).length
  const anios = [...new Set(todas.map((n) => String(n.anio)))].sort().reverse()

  useTituloPagina({
    titulo: 'Nóminas',
    insignia: sinFirmar ? <Etiqueta punto tono="amarillo">{sinFirmar} por firmar</Etiqueta> : undefined,
  }, [sinFirmar])

  return (
    <div className="flex h-full flex-col">
      {esAdmin && (
        <Pestanas activa={pestana} onCambiar={setPestana} pestanas={[
          { id: 'todas', texto: 'Todo el equipo', contador: todas.length },
          { id: 'mias', texto: 'Mis nóminas', contador: mias.length },
        ]} />
      )}
      <BarraFiltros
        filtros={
          <>
            {esAdmin && pestana === 'todas' && (
              <FiltroPastilla etiqueta="Empleado" valor={quien} onChange={setQuien} opciones={[{ valor: 'todos', texto: 'Todos' }, ...empleados.map((e) => ({ valor: e.id_empleado, texto: nombreCompleto(e) }))]} />
            )}
            <FiltroPastilla etiqueta="Año" valor={anio} onChange={setAnio} opciones={[{ valor: 'todos', texto: 'Todos' }, ...anios.map((a) => ({ valor: a, texto: a }))]} />
            <FiltroPastilla etiqueta="Estado" valor={estado} onChange={setEstado} opciones={[{ valor: 'todas', texto: 'Todas' }, { valor: 'pendientes', texto: 'Pendientes de firma' }, { valor: 'firmadas', texto: 'Firmadas' }]} />
          </>
        }
        acciones={esAdmin && <button type="button" className="btn-primario" onClick={() => setSubiendo(true)}><Icono nombre="subir" tamano={14} /> Subir nómina</button>}
      />
      {error ? <ErrorCarga mensaje={error} reintentar={recargar} /> : (
        <div className="min-h-0 flex-1 overflow-auto border-t border-borde">
          {cargando && !datos ? <div className="p-6"><BloqueCargando alto={240} /></div> : <ListaNominas nominas={visibles} conEmpleado={pestana === 'todas'} onCambio={recargar} />}
        </div>
      )}
      <PieTabla items={[
        { valor: visibles.length, etiqueta: visibles.length === 1 ? 'nómina en vista' : 'nóminas en vista' },
        { valor: visibles.filter((n) => n.firmada).length, etiqueta: 'firmadas' },
        { valor: visibles.filter((n) => !n.firmada).length, etiqueta: 'pendientes de firma' },
        ...(visibles.length ? [{ valor: `${MESES[visibles[0].mes - 1]} ${visibles[0].anio}`, etiqueta: 'la más reciente' }] : []),
      ]} />
      <FormNomina abierto={subiendo} onCerrar={() => setSubiendo(false)} onGuardada={recargar} />
    </div>
  )
}
