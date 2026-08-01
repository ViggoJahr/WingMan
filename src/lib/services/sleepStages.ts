/**
 * Sleep stage composition, derived from what Google Health actually stores.
 *
 * `sleep_logs.sleep_stages` has been written on every sync since the adapter
 * was built and read by nothing. The shape below was taken from live rows, not
 * from the API docs: an array of contiguous segments, each with a stage type
 * and its own interval.
 *
 *   [{ type: "LIGHT", startTime: "...Z", endTime: "...Z",
 *      startUtcOffset: "7200s", endUtcOffset: "7200s" }, ...]
 *
 * Pure and dependency-free, like the rest of lib/services, so the totals can be
 * unit-tested without a database.
 */

/** Ordered shallow-to-deep, which is also the order they stack in the bar. */
export const SLEEP_STAGES = ["awake", "rem", "light", "deep"] as const

export type SleepStage = (typeof SLEEP_STAGES)[number]

export const SLEEP_STAGE_LABELS: Record<SleepStage, string> = {
  awake: "Awake",
  rem: "REM",
  light: "Light",
  deep: "Deep",
}

/**
 * Depth as a single ramp rather than four hues. The stages are ordered, not
 * categorical, so a sequential scale carries the meaning - and keeps the chart
 * on the one hue the palette uses for magnitude.
 */
export const SLEEP_STAGE_FILL: Record<SleepStage, string> = {
  awake: "var(--track)",
  rem: "color-mix(in oklab, var(--brand-accent) 35%, transparent)",
  light: "color-mix(in oklab, var(--brand-accent) 65%, transparent)",
  deep: "var(--brand-accent)",
}

/**
 * Google's vocabulary. Anything unrecognised is dropped rather than bucketed
 * into a stage it might not belong to - an unknown segment inflating "light"
 * would be worse than a total that is honestly short.
 */
const STAGE_BY_TYPE: Record<string, SleepStage> = {
  AWAKE: "awake",
  REM: "rem",
  LIGHT: "light",
  DEEP: "deep",
  // Seen on some devices; both mean the same thing as AWAKE for our purposes.
  OUT_OF_BED: "awake",
  WAKE: "awake",
}

interface StageSegment {
  type?: unknown
  startTime?: unknown
  endTime?: unknown
}

export type StageMinutes = Record<SleepStage, number>

export interface SleepComposition {
  minutes: StageMinutes
  /** Everything except `awake` - the part that is actually sleep. */
  asleepMinutes: number
  /** Including awake time in bed. */
  inBedMinutes: number
  /** Asleep as a share of time in bed, 0-1. Null when nothing was recorded. */
  efficiency: number | null
}

const EMPTY: StageMinutes = { awake: 0, rem: 0, light: 0, deep: 0 }

function segmentMinutes(segment: StageSegment): number {
  if (typeof segment.startTime !== "string" || typeof segment.endTime !== "string") return 0
  const start = new Date(segment.startTime).getTime()
  const end = new Date(segment.endTime).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return (end - start) / 60_000
}

/**
 * Sums the segments into per-stage minutes.
 *
 * Takes `unknown` because the column is untyped jsonb written by a third party
 * - validating here is cheaper than trusting a cast at every call site.
 */
export function summariseSleepStages(raw: unknown): SleepComposition {
  const minutes: StageMinutes = { ...EMPTY }

  if (Array.isArray(raw)) {
    for (const entry of raw as StageSegment[]) {
      if (!entry || typeof entry !== "object") continue
      const stage = STAGE_BY_TYPE[String(entry.type ?? "").toUpperCase()]
      if (!stage) continue
      minutes[stage] += segmentMinutes(entry)
    }
  }

  for (const stage of SLEEP_STAGES) minutes[stage] = Math.round(minutes[stage])

  const asleepMinutes = minutes.rem + minutes.light + minutes.deep
  const inBedMinutes = asleepMinutes + minutes.awake

  return {
    minutes,
    asleepMinutes,
    inBedMinutes,
    efficiency: inBedMinutes > 0 ? asleepMinutes / inBedMinutes : null,
  }
}

/** True when there is enough to draw. Guards the empty state at call sites. */
export function hasStageDetail(composition: SleepComposition): boolean {
  return composition.inBedMinutes > 0
}

/** "7h 22m", or "22m" under an hour. */
export function formatMinutes(total: number): string {
  const rounded = Math.round(total)
  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}
