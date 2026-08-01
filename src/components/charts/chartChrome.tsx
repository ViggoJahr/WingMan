"use client"

import { CartesianGrid, XAxis, YAxis } from "recharts"

/**
 * Everything three charts had drifting copies of: the tooltip shell, the axis
 * tick style, and the grid.
 *
 * The values were identical in all three, which is exactly why they drifted -
 * nothing forced them to stay that way. A rebrand had to be applied three times
 * and the third one was always the one that got missed.
 */

/** Chart series tokens, in the order the palette intends them to be used. */
export type ChartColor = "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5"

/**
 * Semantic assignment, so a slot means something rather than being whichever
 * number the page happened to reach for.
 *
 * **A single-series chart always uses `primary`.** Resting HR, HRV, SpO2 and
 * active zone minutes were on chart-2 through chart-5 for no reason beyond
 * being written in that order - four different hues for four charts that never
 * appear on the same axes and so never needed telling apart. Colour is for
 * encoding a category, not for decorating a card.
 *
 * The rest of the ramp exists only where categories genuinely share an axis,
 * which in this app is the handball box score and nothing else.
 */
export const SERIES_COLOR = {
  /** The subject of the chart. Load, weight, readiness, goals. */
  primary: "chart-1",
  /** A second category on the same axes. */
  secondary: "chart-2",
  /** A third, and so on. Beyond five, stop using colour to encode. */
  tertiary: "chart-3",
  quaternary: "chart-4",
  quinary: "chart-5",
} as const satisfies Record<string, ChartColor>

export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 } as const

/**
 * Shared tooltip container. Takes children rather than a value, because the
 * three callers genuinely differ in body - a single series, a stacked list, and
 * a min/avg/max triple - while the frame around them never did.
 */
export function ChartTooltipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">{children}</div>
  )
}

/** Horizontal rules only: vertical lines compete with the bars and lines. */
export function ChartGrid() {
  return <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
}

export function ChartXAxis({
  dataKey,
  tickFormatter,
}: {
  dataKey: string
  tickFormatter?: (value: string) => string
}) {
  return (
    <XAxis
      dataKey={dataKey}
      tickFormatter={tickFormatter}
      tick={AXIS_TICK}
      axisLine={{ stroke: "var(--border)" }}
      tickLine={false}
    />
  )
}

export function ChartYAxis({
  domain,
  width = 40,
  allowDecimals,
}: {
  domain?: [number | string, number | string]
  width?: number
  allowDecimals?: boolean
}) {
  return (
    <YAxis
      domain={domain}
      tick={AXIS_TICK}
      axisLine={false}
      tickLine={false}
      width={width}
      allowDecimals={allowDecimals}
    />
  )
}

/**
 * Recharts 3.10 entrance animations never complete under React 19 here, and
 * they fail silently - a bar stalls at height 0 and renders nothing, a line
 * stalls partway through its stroke-dasharray sweep. Spread this onto every
 * series rather than remembering the prop each time.
 *
 * See docs/vision.md for the full diagnosis.
 */
export const NO_ENTRANCE_ANIMATION = { isAnimationActive: false } as const
