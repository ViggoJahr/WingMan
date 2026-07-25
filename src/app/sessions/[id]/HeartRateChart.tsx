"use client"

import { useEffect, useState } from "react"
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
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
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="font-semibold text-foreground">{point.avg} bpm avg</p>
      <p className="text-muted-foreground">
        {point.min}-{point.max} bpm range
      </p>
      <p className="text-muted-foreground">{label ? formatTime(String(label)) : ""}</p>
    </div>
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
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="startTime"
            tickFormatter={formatTime}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            domain={["dataMin - 5", "dataMax + 5"]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<HrTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Area
            dataKey="range"
            stroke="none"
            fill="var(--chart-1)"
            fillOpacity={0.12}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground">Shaded band = min-max range per minute, line = average.</p>
    </div>
  )
}
