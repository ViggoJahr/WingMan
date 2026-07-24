import type { Json } from "@/lib/supabase/types"
import type { GoogleHealthDataPoint } from "./client"

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value))
}

// Field paths below are best-effort from documentation alone (no live
// payload seen yet) - defensively check a few plausible locations. Once
// connected, a real sync will reveal the actual shape; only these
// extraction helpers should need correcting (raw_payload keeps everything
// regardless), same mitigation already used for the TUGG adapter.
function pointId(dp: GoogleHealthDataPoint): string {
  return (dp.name as string) ?? JSON.stringify(dp).slice(0, 100)
}

function intervalStart(dp: GoogleHealthDataPoint): string | undefined {
  return dp.interval?.startTime ?? (dp.data?.interval as { startTime?: string } | undefined)?.startTime
}

function intervalEnd(dp: GoogleHealthDataPoint): string | undefined {
  return dp.interval?.endTime ?? (dp.data?.interval as { endTime?: string } | undefined)?.endTime
}

function sampleTime(dp: GoogleHealthDataPoint): string | undefined {
  return dp.sampleTime?.physicalTime
}

export function normalizeExercise(dp: GoogleHealthDataPoint, userId: string) {
  const exercise = (dp.data?.exercise ?? dp.data) as Record<string, unknown> | undefined
  const start = intervalStart(dp)
  const end = intervalEnd(dp)

  return {
    session: {
      user_id: userId,
      type: "cardio" as const,
      start_time: start ?? new Date().toISOString(),
      end_time: end ?? null,
      external_source: "google_health",
      external_id: pointId(dp),
      raw_payload: toJson(dp),
    },
    cardioDetail: {
      focus: (exercise?.exerciseType as string) ?? null,
      distance_m: (exercise?.distanceMeters as number) ?? null,
      avg_hr: (exercise?.averageHeartRate as number) ?? null,
    },
  }
}

export function normalizeSleep(dp: GoogleHealthDataPoint, userId: string) {
  const start = intervalStart(dp)
  const end = intervalEnd(dp)
  const durationMinutes =
    start && end ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000) : null

  return {
    user_id: userId,
    start_time: start ?? new Date().toISOString(),
    end_time: end ?? null,
    duration_minutes: durationMinutes,
    sleep_stages: toJson(dp.data?.sleepStage ?? dp.data?.sleep ?? null),
    external_source: "google_health",
    external_id: pointId(dp),
    raw_payload: toJson(dp),
  }
}

export function normalizeWeight(dp: GoogleHealthDataPoint, userId: string) {
  const weight = (dp.data?.weight ?? dp.data) as Record<string, unknown> | undefined
  const time = sampleTime(dp) ?? intervalStart(dp)

  return {
    user_id: userId,
    date: (time ?? new Date().toISOString()).slice(0, 10),
    weight_kg: (weight?.value as number) ?? null,
    external_source: "google_health",
    external_id: pointId(dp),
  }
}

export interface DayBucket {
  steps: number
  restingHeartRate: number | null
  raw: GoogleHealthDataPoint[]
}

export function bucketByDay(points: GoogleHealthDataPoint[], valueKey: string): Map<string, number> {
  const byDay = new Map<string, number>()
  for (const dp of points) {
    const time = intervalStart(dp) ?? sampleTime(dp)
    if (!time) continue
    const day = time.slice(0, 10)
    const data = dp.data as Record<string, unknown> | undefined
    const value = (data?.[valueKey] as { count?: number; value?: number } | number | undefined) ?? 0
    const numericValue = typeof value === "number" ? value : (value.count ?? value.value ?? 0)
    byDay.set(day, (byDay.get(day) ?? 0) + numericValue)
  }
  return byDay
}
