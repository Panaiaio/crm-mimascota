'use client'

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTemaActual } from '@/hooks/useTema'
import { formatEUR } from '@/lib/utils'

export interface DatoEstado {
  estado: string
  texto: string
  oportunidades: number
  valor: number
}

// Colores comprobados para daltonismo y contraste: gris para todos, verde para "Atendido" y rojo para "Descartado"
const COLORES = {
  light: { normal: '#a1a1aa', bien: '#059669', mal: '#b91c1c', rejilla: '#ececee', texto: '#8c8c94', cursor: 'rgba(0,0,0,0.04)' },
  dark: { normal: '#71717a', bien: '#34d399', mal: '#e11d48', rejilla: '#232326', texto: '#6f6f78', cursor: 'rgba(255,255,255,0.04)' },
}

function Ayuda({ active, payload }: { active?: boolean; payload?: { payload: DatoEstado }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-borde bg-superficie px-3 py-2 text-[12.5px] shadow-[var(--sombra)]">
      <p className="font-medium text-texto">{d.texto}</p>
      <p className="text-texto-2">{d.oportunidades} {d.oportunidades === 1 ? 'oportunidad' : 'oportunidades'}</p>
      <p className="text-texto-3">{formatEUR(d.valor)}</p>
    </div>
  )
}

/** Gráfica de columnas con el número de oportunidades en cada estado (librería recharts) */
export default function GraficoEstados({ datos }: { datos: DatoEstado[] }) {
  const c = COLORES[useTemaActual()]
  return (
    <div className="h-64 w-full" role="img" aria-label={datos.map((d) => `${d.texto}: ${d.oportunidades}`).join(', ')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 20, right: 4, bottom: 0, left: -24 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={c.rejilla} />
          <XAxis dataKey="texto" tickLine={false} axisLine={false} interval={0} tick={{ fill: c.texto, fontSize: 11 }} tickFormatter={(t: string) => (t.length > 8 ? t.slice(0, 7) + '.' : t)} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: c.texto, fontSize: 11 }} width={44} />
          <Tooltip content={<Ayuda />} cursor={{ fill: c.cursor }} />
          <Bar dataKey="oportunidades" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
            {datos.map((d) => <Cell key={d.estado} fill={d.estado === 'atendido' ? c.bien : d.estado === 'descartado' ? c.mal : c.normal} />)}
            <LabelList dataKey="oportunidades" position="top" fill={c.texto} fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
