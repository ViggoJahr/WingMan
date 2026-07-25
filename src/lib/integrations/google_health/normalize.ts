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

// "3469.783s" -> 3470 (round to nearest second). Durations from Google
// Health arrive as strings with a trailing "s", protobuf Duration style.
function parseDurationSeconds(value: unknown): number | null {
  if (typeof value !== "string") return null
  const seconds = Number.parseFloat(value.replace(/s$/, ""))
  return Number.isFinite(seconds) ? Math.round(seconds) : null
}

function parseIntString(value: unknown): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function civilDate(date: { year: number; month: number; day: number }): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
}

type SessionType = "strength_power" | "cardio" | "mobility_rehab" | "active_rest" | "handball"

// Confirmed live (2026-07-25) across 17 real synced sessions: exerciseType
// is a real enum (STRENGTH_TRAINING, BIKING, WALKING, ROWING_MACHINE,
// WORKOUT, HANDBALL, BASKETBALL, ...), previously hardcoded to "cardio"
// for everything, which mis-bucketed strength sessions and lost the
// auto-detected handball activity entirely. Other ball/team sports without
// their own session_type slot fall back to "cardio" - the specific
// activity name is still preserved via cardioDetail.focus (displayName).
function mapExerciseType(exerciseType: string | undefined): SessionType {
  switch (exerciseType) {
    case "STRENGTH_TRAINING":
      return "strength_power"
    case "HANDBALL":
      return "handball"
    default:
      return "cardio"
  }
}

interface ExerciseShape {
  interval?: { startTime?: string; endTime?: string }
  exerciseType?: string
  displayName?: string
  activeDuration?: string
  metricsSummary?: {
    caloriesKcal?: number
    averageHeartRateBeatsPerMinute?: string
    activeZoneMinutes?: string
    distanceMeters?: number
    heartRateZoneDurations?: {
      lightTime?: string
      moderateTime?: string
      vigorousTime?: string
      peakTime?: string
    }
  }
}

export function normalizeExercise(dp: GoogleHealthDataPoint, userId: string) {
  const exercise = dp.exercise as ExerciseShape
  const startMs = pointTimeMs(dp, "exercise")
  const zones = exercise.metricsSummary?.heartRateZoneDurations
  const sessionType = mapExerciseType(exercise.exerciseType)

  return {
    sessionType,
    // HANDBALL auto-detected here has no practice/match distinction yet -
    // deliberately left for a future manual-annotation step (attach this
    // session_id from the practice/match log forms) rather than guessed at.
    session: {
      user_id: userId,
      type: sessionType,
      start_time: exercise.interval?.startTime ?? isoFromMs(startMs),
      end_time: exercise.interval?.endTime ?? null,
      calories_kcal: exercise.metricsSummary?.caloriesKcal ?? null,
      active_duration_seconds: parseDurationSeconds(exercise.activeDuration),
      active_zone_minutes: parseIntString(exercise.metricsSummary?.activeZoneMinutes),
      hr_zones: zones
        ? toJson({
            light_sec: parseDurationSeconds(zones.lightTime),
            moderate_sec: parseDurationSeconds(zones.moderateTime),
            vigorous_sec: parseDurationSeconds(zones.vigorousTime),
            peak_sec: parseDurationSeconds(zones.peakTime),
          })
        : null,
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
    strengthDetail: {
      focus: exercise.displayName ?? exercise.exerciseType ?? null,
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
  const cd = weight.sampleTime?.civilTime?.date
  const date = cd ? civilDate(cd) : (weight.sampleTime?.physicalTime ?? isoFromMs(pointTimeMs(dp, "weight"))).slice(0, 10)

  return {
    user_id: userId,
    date,
    weight_kg: weight.weightGrams != null ? weight.weightGrams / 1000 : null,
    external_source: "google_health",
    external_id: pointId(dp),
  }
}

export function normalizeBodyFat(dp: GoogleHealthDataPoint, userId: string) {
  const bodyFat = dp.bodyFat as {
    sampleTime?: { physicalTime?: string; civilTime?: { date?: { year: number; month: number; day: number } } }
    percentage?: number
  }
  const cd = bodyFat.sampleTime?.civilTime?.date
  const date = cd
    ? civilDate(cd)
    : (bodyFat.sampleTime?.physicalTime ?? isoFromMs(pointTimeMs(dp, "bodyFat"))).slice(0, 10)

  return {
    user_id: userId,
    date,
    body_fat_percentage: bodyFat.percentage ?? null,
    external_source: "google_health",
    external_id: pointId(dp),
  }
}

export function normalizeHeight(dp: GoogleHealthDataPoint, userId: string) {
  const height = dp.height as {
    sampleTime?: { physicalTime?: string; civilTime?: { date?: { year: number; month: number; day: number } } }
    heightMillimeters?: string
  }
  const cd = height.sampleTime?.civilTime?.date
  const date = cd
    ? civilDate(cd)
    : (height.sampleTime?.physicalTime ?? isoFromMs(pointTimeMs(dp, "height"))).slice(0, 10)
  const mm = parseIntString(height.heightMillimeters)

  return {
    user_id: userId,
    date,
    height_cm: mm != null ? mm / 10 : null,
    external_source: "google_health",
    external_id: pointId(dp),
  }
}

// Buckets a numeric field to local calendar day. `mode: "sum"` for
// cumulative counts (steps, active zone minutes), `mode: "avg"` for
// point-in-time measurements sampled repeatedly through the day
// (resting HR, HRV, SpO2).
export function bucketByDay(
  points: GoogleHealthDataPoint[],
  typeKey: string,
  valueField: string,
  mode: "sum" | "avg" = "sum"
) {
  const sums = new Map<string, number>()
  const counts = new Map<string, number>()

  for (const dp of points) {
    const payload = dp[typeKey] as Record<string, unknown> | undefined
    if (!payload) continue

    const cd =
      (payload.interval as { civilStartTime?: { date?: { year: number; month: number; day: number } } })
        ?.civilStartTime?.date ?? (payload.date as { year: number; month: number; day: number } | undefined)
    const day = cd ? civilDate(cd) : isoFromMs(pointTimeMs(dp, typeKey)).slice(0, 10)

    const raw = payload[valueField]
    const value = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : null
    if (value == null || !Number.isFinite(value)) continue

    sums.set(day, (sums.get(day) ?? 0) + value)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  if (mode === "sum") return sums
  const avgs = new Map<string, number>()
  for (const [day, sum] of sums) avgs.set(day, Math.round((sum / (counts.get(day) ?? 1)) * 10) / 10)
  return avgs
}
