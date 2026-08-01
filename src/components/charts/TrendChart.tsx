"use client"

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatDate } from "@/lib/dates"
import { formatValue, type ValueFormat } from "@/lib/valueFormat"

export type { ValueFormat }

/**
 * Declared once at module scope and passed as an element
 * (`content={<ChartTooltip format={...} />}`) rather than built per render.
 * A factory returning a fresh component would give Recharts a new component
 * type on every render, remounting the tooltip each time.
 */
function ChartTooltip({
  active,
  payload,
  label,
  format,
  labelPrefix = "",
}: {
  active?: boolean
  payload?: ReadonlyArray<{ value?: unknown }>
  label?: unknown
  format?: ValueFormat
  labelPrefix?: string
}) {
  const value = payload?.[0]?.value
  if (!active || typeof value !== "number") return null

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="font-semibold text-foreground">{formatValue(value, format)}</p>
      <p className="text-muted-foreground">
        {label ? `${labelPrefix}${formatDate(String(label))}` : ""}
      </p>
    </div>
  )
}

export interface TrendPoint {
  date: string
  value: number
}

export interface TrendChartProps {
  data: TrendPoint[]
  kind: "line" | "bar"
  color: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5"
  format?: ValueFormat
  yDomain?: [number | string, number | string]
  height?: number
  /** Prefixes the tooltip's date line, e.g. "Week of " for a weekly rollup. */
  labelPrefix?: string
}

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 }

export function TrendChart({
  data,
  kind,
  color,
  format,
  yDomain,
  height = 240,
  labelPrefix,
}: TrendChartProps) {
  const stroke = `var(--${color})`
  const tooltip = <ChartTooltip format={format} labelPrefix={labelPrefix} />

  const grid = <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
  const xAxis = (
    <XAxis
      dataKey="date"
      tickFormatter={formatDate}
      tick={AXIS_TICK}
      axisLine={{ stroke: "var(--border)" }}
      tickLine={false}
    />
  )

  // ResponsiveContainer is given a direct element child in each branch rather
  // than a ternary expression - it uses Children.only + cloneElement to inject
  // the measured width/height, and is fussy about what it receives.
  if (kind === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          {grid}
          {xAxis}
          <YAxis domain={yDomain} tick={AXIS_TICK} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={tooltip} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="value" fill={stroke} radius={[4, 4, 0, 0]} maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {grid}
        {xAxis}
        <YAxis
          domain={yDomain ?? ["dataMin - 1", "dataMax + 1"]}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={tooltip} cursor={{ stroke: "var(--border)" }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          dot={{ r: 4, fill: stroke, stroke: "var(--card)", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
