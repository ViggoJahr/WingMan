import type { Json } from "@/lib/supabase/types"
import { pointTimeMs, type GoogleHealthDataPoint } from "./client"

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value))
}

function pointId(dp: GoogleHealthDataPoint): string {
  return (dp.name as string) ?? JSON.stringify(dp).slice(0, 100)
}

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString()
}

// Confirmed live shape (2026-07-25) - see client.ts. Numeric fields that
// are int64 in the proto (count, beatsPerMinute, calories' HR fields, etc.)
// arrive as strings, so every numeric extraction below parses explicitly.
export function normalizeExercise(dp: GoogleHealthDataPoint, userId: string) {
  const exercise = dp.exercise as {
    interval?: { startTime?: string; endTime?: string }
    exerciseType?: string
    displayName?: string
    metricsSummary?: {
      averageHeartRateBeatsPerMinute?: string
      distanceMeters?: number
    }
  }

  const startMs = pointTimeMs(dp, "exercise")
  const endTime = exercise.interval?.endTime

  return {
    session: {
      user_id: userId,
      type: "cardio" as const,
      start_time: exercise.interval?.startTime ?? isoFromMs(startMs),
      end_time: endTime ?? null,
      external_source: "google_health",
      external_id: pointId(dp),
      raw_payload: toJson(dp),
    },
    cardioDetail: {
      focus: exercise.displayName ?? exercise.exerciseType ?? null,
      distance_m: exercise.metricsSummary?.distanceMeters ?? null,
      avg_hr: exercise.metricsSummary?.averageHeartRateBeatsPerMinute
        ? Number(exercise.metricsSummary.averageHeartRateBeatsPerMinute)
        : null,
    },
  }
}

export function normalizeSleep(dp: GoogleHealthDataPoint, userId: string) {
  const sleep = dp.sleep as {
    interval?: { startTime?: string; endTime?: string }
    stages?: unknown
  }
  const start = sleep.interval?.startTime
  const end = sleep.interval?.endTime
  const durationMinutes =
    start && end ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000) : null

  return {
    user_id: userId,
    start_time: start ?? isoFromMs(pointTimeMs(dp, "sleep")),
    end_time: end ?? null,
    duration_minutes: durationMinutes,
    sleep_stages: toJson(sleep.stages ?? null),
    external_source: "google_health",
    external_id: pointId(dp),
    raw_payload: toJson(dp),
  }
}

export function normalizeWeight(dp: GoogleHealthDataPoint, userId: string) {
  const weight = dp.weight as {
    sampleTime?: { physicalTime?: string; civilTime?: { date?: { year: number; month: number; day: number } } }
    weightGrams?: number
  }

  const civilDate = weight.sampleTime?.civilTime?.date
  const date = civilDate
    ? `${civilDate.year}-${String(civilDate.month).padStart(2, "0")}-${String(civilDate.day).padStart(2, "0")}`
    : (weight.sampleTime?.physicalTime ?? isoFromMs(pointTimeMs(dp, "weight"))).slice(0, 10)

  return {
    user_id: userId,
    date,
    weight_kg: weight.weightGrams != null ? weight.weightGrams / 1000 : null,
    external_source: "google_health",
    external_id: pointId(dp),
  }
}

// Buckets steps (count) or resting heart rate (beatsPerMinute) data points
// by local calendar day - both are int64-as-string fields in the API.
export function bucketByDay(points: GoogleHealthDataPoint[], typeKey: string, valueField: string) {
  const byDay = new Map<string, number>()
  for (const dp of points) {
    const payload = dp[typeKey] as Record<string, unknown> | undefined
    if (!payload) continue

    const civilDate = (
      (payload.interval as { civilStartTime?: { date?: { year: number; month: number; day: number } } })
        ?.civilStartTime?.date ?? (payload.date as { year: number; month: number; day: number } | undefined)
    )
    const day = civilDate
      ? `${civilDate.year}-${String(civilDate.month).padStart(2, "0")}-${String(civilDate.day).padStart(2, "0")}`
      : isoFromMs(pointTimeMs(dp, typeKey)).slice(0, 10)

    const raw = payload[valueField]
    const value = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : 0
    if (valueField === "count") {
      byDay.set(day, (byDay.get(day) ?? 0) + value)
    } else {
      // Non-cumulative fields (e.g. resting heart rate): last value wins.
      byDay.set(day, value)
    }
  }
  return byDay
}
