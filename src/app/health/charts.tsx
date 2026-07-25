"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function makeTooltip(formatValue: (v: number) => string) {
  return function ChartTooltip(props: {
    active?: boolean
    payload?: ReadonlyArray<{ value?: unknown }>
    label?: unknown
  }) {
    const { active, payload, label } = props
    const value = payload?.[0]?.value
    if (!active || typeof value !== "number") return null
    return (
      <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
        <p className="font-semibold text-foreground">{formatValue(value)}</p>
        <p className="text-muted-foreground">{label ? formatDate(String(label)) : ""}</p>
      </div>
    )
  }
}

export interface WeightPoint {
  date: string
  weight_kg: number
}

export function WeightChart({ data }: { data: WeightPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          domain={["dataMin - 1", "dataMax + 1"]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={makeTooltip((v) => `${v.toFixed(1)} kg`)} cursor={{ stroke: "var(--border)" }} />
        <Line
          type="monotone"
          dataKey="weight_kg"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export interface StepsPoint {
  date: string
  steps: number
}

export function StepsChart({ data }: { data: StepsPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          content={makeTooltip((v) => `${v.toLocaleString()} steps`)}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="steps" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export interface SleepPoint {
  date: string
  hours: number
}

export function SleepChart({ data }: { data: SleepPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip content={makeTooltip((v) => `${v.toFixed(1)}h`)} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="hours" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
