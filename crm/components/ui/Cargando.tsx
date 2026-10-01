/** Filas grises mientras llegan los datos */
export function FilasCargando({ filas = 8, columnas = 6 }: { filas?: number; columnas?: number }) {
  return (
    <tbody>
      {Array.from({ length: filas }, (_, i) => (
        <tr key={i}>
          {Array.from({ length: columnas }, (_, j) => (
            <td key={j}>
              <div className="esqueleto h-3.5 rounded" style={{ width: `${50 + ((i * 7 + j * 13) % 45)}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

export function BloqueCargando({ alto = 120 }: { alto?: number }) {
  return <div className="esqueleto w-full rounded-xl" style={{ height: alto }} />
}

/** Pantalla de carga de una ficha */
export function FichaCargando() {
  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center gap-4">
        <div className="esqueleto size-14 rounded-xl" />
        <div className="space-y-2">
          <div className="esqueleto h-5 w-56 rounded" />
          <div className="esqueleto h-3.5 w-36 rounded" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><BloqueCargando alto={260} /></div>
        <BloqueCargando alto={260} />
      </div>
    </div>
  )
}

/** Mensaje de error al cargar */
export function ErrorCarga({ mensaje, reintentar }: { mensaje: string; reintentar?: () => void }) {
  return (
    <div className="m-6 flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-700 dark:text-rose-300">
      <span className="flex-1">No se han podido cargar los datos: {mensaje}</span>
      {reintentar && <button onClick={reintentar} className="btn-secundario">Reintentar</button>}
    </div>
  )
}
