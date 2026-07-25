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

export interface TrendPoint {
  date: string
  value: number
}

export interface TrendChartProps {
  data: TrendPoint[]
  kind: "line" | "bar"
  color: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5"
  formatValue: (v: number) => string
  yDomain?: [number | string, number | string]
  height?: number
}

export function TrendChart({ data, kind, color, formatValue, yDomain, height = 240 }: TrendChartProps) {
  const stroke = `var(--${color})`

  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === "line" ? (
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
            domain={yDomain ?? ["dataMin - 1", "dataMax + 1"]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={makeTooltip(formatValue)} cursor={{ stroke: "var(--border)" }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={2}
            dot={{ r: 4, fill: stroke, stroke: "var(--card)", strokeWidth: 2 }}
          />
        </LineChart>
      ) : (
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
            domain={yDomain}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={makeTooltip(formatValue)} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="value" fill={stroke} radius={[4, 4, 0, 0]} maxBarSize={20} />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
