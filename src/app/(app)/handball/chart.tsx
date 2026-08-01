"use client"

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip } from "recharts"
import {
  ChartGrid,
  ChartTooltipShell,
  ChartXAxis,
  ChartYAxis,
  NO_ENTRANCE_ANIMATION,
  SERIES_COLOR,
  type ChartColor,
} from "@/components/charts/chartChrome"

export interface MatchBoxScorePoint {
  label: string
  goals: number
  assists: number
  steals: number
  technical_faults: number
}

/**
 * Four categories that have to be told apart at a glance, so this is the one
 * place a multi-hue ramp is warranted. Goals take the primary slot because they
 * are what the chart is about.
 */
const SERIES: Array<{
  key: keyof Omit<MatchBoxScorePoint, "label">
  name: string
  color: ChartColor
}> = [
  { key: "goals", name: "Goals", color: SERIES_COLOR.primary },
  { key: "assists", name: "Assists", color: SERIES_COLOR.secondary },
  { key: "steals", name: "Steals", color: SERIES_COLOR.tertiary },
  { key: "technical_faults", name: "Technical faults", color: SERIES_COLOR.quaternary },
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
    <ChartTooltipShell>
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
    </ChartTooltipShell>
  )
}

export function MatchBoxScoreChart({ data }: { data: MatchBoxScorePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <ChartGrid />
        <ChartXAxis dataKey="label" />
        <ChartYAxis width={32} allowDecimals={false} />
        <Tooltip content={<BoxScoreTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
        {SERIES.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={`var(--${s.color})`}
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
            {...NO_ENTRANCE_ANIMATION}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
