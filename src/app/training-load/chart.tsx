"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { WeeklyLoadPoint } from "@/lib/services/trainingLoad"

function formatWeek(weekStart: string) {
  return new Date(weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function TrainingLoadTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="font-semibold text-foreground">{payload[0].value} load</p>
      <p className="text-muted-foreground">Week of {label ? formatWeek(label) : ""}</p>
    </div>
  )
}

export function TrainingLoadChart({ data }: { data: WeeklyLoadPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatWeek}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<TrainingLoadTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="load" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
