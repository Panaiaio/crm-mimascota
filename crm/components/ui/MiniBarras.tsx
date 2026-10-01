/** Mini gráfico de barras verdes (actividad por semana), como "Activity Trend" de la plantilla */
export default function MiniBarras({ valores, titulo }: { valores: number[]; titulo?: string }) {
  const max = Math.max(1, ...valores)
  return (
    <div className="flex h-4 items-end gap-[2px]" title={titulo}>
      {valores.map((v, i) => (
        <span
          key={i}
          className={v ? 'w-[4px] rounded-[1px] bg-emerald-500' : 'w-[4px] rounded-[1px] bg-segmento'}
          style={{ height: `${v ? Math.max(25, (v / max) * 100) : 18}%` }}
        />
      ))}
    </div>
  )
}
