"use client"

import { useEffect, useState } from "react"
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip } from "recharts"
import {
  ChartGrid,
  ChartTooltipShell,
  ChartXAxis,
  ChartYAxis,
  NO_ENTRANCE_ANIMATION,
  SERIES_COLOR,
} from "@/components/charts/chartChrome"
import type { HeartRateRollupBucket } from "@/lib/integrations/google_health/client"
import { getHeartRateTimeline } from "./actions"

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

function HrTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload: HeartRateRollupBucket }>
  label?: unknown
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <ChartTooltipShell>
      <p className="font-semibold text-foreground">{point.avg} bpm avg</p>
      <p className="text-muted-foreground">
        {point.min}-{point.max} bpm range
      </p>
      <p className="text-muted-foreground">{label ? formatTime(String(label)) : ""}</p>
    </ChartTooltipShell>
  )
}

type ChartPoint = HeartRateRollupBucket & { range: [number, number] }

export function HeartRateChart({ startTime, endTime }: { startTime: string; endTime: string }) {
  const [state, setState] = useState<"loading" | "empty" | "error" | "ready">("loading")
  const [buckets, setBuckets] = useState<ChartPoint[]>([])

  useEffect(() => {
    let cancelled = false
    getHeartRateTimeline(startTime, endTime)
      .then((result) => {
        if (cancelled) return
        if (!result || result.length === 0) {
          setState("empty")
        } else {
          setBuckets(result.map((b) => ({ ...b, range: [b.min, b.max] })))
          setState("ready")
        }
      })
      .catch(() => {
        if (!cancelled) setState("error")
      })
    return () => {
      cancelled = true
    }
  }, [startTime, endTime])

  if (state === "loading") {
    return <p className="text-sm text-muted-foreground">Loading heart rate...</p>
  }
  if (state === "empty") {
    return <p className="text-sm text-muted-foreground">No heart rate data for this window.</p>
  }
  if (state === "error") {
    return <p className="text-sm text-muted-foreground">Couldn&apos;t load heart rate data.</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <ChartGrid />
          <ChartXAxis dataKey="startTime" tickFormatter={formatTime} />
          <ChartYAxis domain={["dataMin - 5", "dataMax + 5"]} width={32} />
          <Tooltip content={<HrTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Area
            dataKey="range"
            stroke="none"
            fill={`var(--${SERIES_COLOR.primary})`}
            fillOpacity={0.12}
            {...NO_ENTRANCE_ANIMATION}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke={`var(--${SERIES_COLOR.primary})`}
            strokeWidth={2}
            dot={false}
            {...NO_ENTRANCE_ANIMATION}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground">Shaded band = min-max range per minute, line = average.</p>
    </div>
  )
}
