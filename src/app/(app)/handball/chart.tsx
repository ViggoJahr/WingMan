"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export interface MatchBoxScorePoint {
  label: string
  goals: number
  assists: number
  steals: number
  technical_faults: number
}

const SERIES: Array<{ key: keyof Omit<MatchBoxScorePoint, "label">; name: string; color: string }> = [
  { key: "goals", name: "Goals", color: "var(--chart-1)" },
  { key: "assists", name: "Assists", color: "var(--chart-2)" },
  { key: "steals", name: "Steals", color: "var(--chart-3)" },
  { key: "technical_faults", name: "Technical faults", color: "var(--chart-4)" },
]

function BoxScoreTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="font-semibold text-foreground">{entry.value}</span> {entry.name}
        </p>
      ))}
    </div>
  )
}

export function MatchBoxScoreChart({ data }: { data: MatchBoxScorePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={32}
          allowDecimals={false}
        />
        <Tooltip content={<BoxScoreTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        {SERIES.map((s) => (
          // isAnimationActive={false} for the same reason as TrendChart: under
          // Recharts 3.10 + React 19 the entrance animation leaves every bar at
          // height 0 permanently, and a zero-height Rectangle renders nothing.
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
