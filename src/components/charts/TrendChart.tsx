"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
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
  /**
   * The athlete's normal range, shaded behind the series. Same band as the
   * sparklines use, so a chart and the row that links to it agree about what
   * counts as normal.
   */
  band?: { low: number; high: number } | null
}

/**
 * Deterministic per colour: the definition is identical everywhere it appears,
 * so two charts of the same series colour on one page share one gradient rather
 * than fighting over an id.
 */
const areaGradientId = (color: ChartColor) => `trend-area-${color}`

export function TrendChart({
  data,
  kind,
  color,
  format,
  yDomain,
  height = 240,
  labelPrefix,
  band,
}: TrendChartProps) {
  const stroke = `var(--${color})`
  const tooltip = <ChartTooltip format={format} labelPrefix={labelPrefix} />
  const last = data.at(-1)

  // ResponsiveContainer is given a direct element child in each branch rather
  // than a ternary expression - it uses Children.only + cloneElement to inject
  // the measured width/height, and is fussy about what it receives.
  if (kind === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <ChartGrid />
          <ChartXAxis dataKey="date" tickFormatter={formatDate} />
          <ChartYAxis domain={yDomain} width={44} />
          {band && (
            <ReferenceArea
              y1={band.low}
              y2={band.high}
              fill="var(--brand-muted)"
              stroke="none"
              ifOverflow="extendDomain"
            />
          )}
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
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          {/* The fill fades to nothing rather than stopping at a hard edge, so
              the area reads as depth under the line instead of as a second
              series stacked beneath it. */}
          <linearGradient id={areaGradientId(color)} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>

        <ChartGrid />
        <ChartXAxis dataKey="date" tickFormatter={formatDate} />
        <ChartYAxis domain={yDomain ?? ["dataMin - 1", "dataMax + 1"]} />

        {band && (
          <ReferenceArea
            y1={band.low}
            y2={band.high}
            fill="var(--brand-muted)"
            stroke="none"
            ifOverflow="extendDomain"
          />
        )}

        <Tooltip content={tooltip} cursor={{ stroke: "var(--border)" }} />

        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          fill={`url(#${areaGradientId(color)})`}
          // Per-point dots turn a 90-day series into a dotted band. The one dot
          // that carries meaning is the last, which is drawn below.
          dot={false}
          activeDot={{ r: 4, fill: stroke, stroke: "var(--card)", strokeWidth: 2 }}
          {...NO_ENTRANCE_ANIMATION}
        />

        {last && (
          <ReferenceDot
            x={last.date}
            y={last.value}
            r={4}
            fill={stroke}
            stroke="var(--card)"
            strokeWidth={2}
            // The lit "you are here" marker, matching the sparklines.
            className="glow"
            style={{ color: stroke }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
