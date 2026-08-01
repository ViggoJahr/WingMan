"use client"

import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip } from "recharts"
import { formatDate } from "@/lib/dates"
import { formatValue, type ValueFormat } from "@/lib/valueFormat"
import {
  ChartGrid,
  ChartTooltipShell,
  ChartXAxis,
  ChartYAxis,
  NO_ENTRANCE_ANIMATION,
  type ChartColor,
} from "./chartChrome"

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
    <ChartTooltipShell>
      <p className="font-semibold text-foreground">{formatValue(value, format)}</p>
      <p className="text-muted-foreground">
        {label ? `${labelPrefix}${formatDate(String(label))}` : ""}
      </p>
    </ChartTooltipShell>
  )
}

export interface TrendPoint {
  date: string
  value: number
}

export interface TrendChartProps {
  data: TrendPoint[]
  kind: "line" | "bar"
  color: ChartColor
  format?: ValueFormat
  yDomain?: [number | string, number | string]
  height?: number
  /** Prefixes the tooltip's date line, e.g. "Week of " for a weekly rollup. */
  labelPrefix?: string
}

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

  // ResponsiveContainer is given a direct element child in each branch rather
  // than a ternary expression - it uses Children.only + cloneElement to inject
  // the measured width/height, and is fussy about what it receives.
  if (kind === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <ChartGrid />
          <ChartXAxis dataKey="date" tickFormatter={formatDate} />
          <ChartYAxis domain={yDomain} width={44} />
          <Tooltip content={tooltip} cursor={{ fill: "var(--muted)" }} />
          <Bar
            dataKey="value"
            fill={stroke}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
            {...NO_ENTRANCE_ANIMATION}
          />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <ChartGrid />
        <ChartXAxis dataKey="date" tickFormatter={formatDate} />
        <ChartYAxis domain={yDomain ?? ["dataMin - 1", "dataMax + 1"]} />
        <Tooltip content={tooltip} cursor={{ stroke: "var(--border)" }} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          dot={{ r: 4, fill: stroke, stroke: "var(--card)", strokeWidth: 2 }}
          {...NO_ENTRANCE_ANIMATION}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
