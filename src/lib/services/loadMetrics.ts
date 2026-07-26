// Rolling training-load metrics derived from the daily load series.
//
// These are the standard sports-science indicators for "am I ramping up too
// fast" and "is my training too samey", both of which are far more useful
// than raw weekly load on its own:
//
//   ACWR     acute (7d) load divided by chronic (28d) average weekly load.
//            Ratios well above 1 mean this week is much harder than what the
//            body is adapted to.
//   Monotony mean daily load divided by its standard deviation over 7 days
//            (Foster). High monotony = every day the same, no easy days.
//   Strain   weekly load x monotony. High load AND no variation.
//
// Every function here is pure so it can be unit-tested without a database.

export const ACUTE_DAYS = 7
export const CHRONIC_DAYS = 28

export interface DailyLoadPoint {
  day: string
  load: number
}

export interface LoadMetricsPoint {
  day: string
  load: number
  /** Total load over the trailing 7 days; null until 7 days of history exist. */
  acute: number | null
  /** 28-day load expressed as an average week; null until 28 days exist. */
  chronic: number | null
  acwr: number | null
  monotony: number | null
  strain: number | null
}

export type AcwrBand = "low" | "optimal" | "caution" | "high"

// Bands follow the commonly cited "sweet spot" model. Treat them as a rough
// guide rather than a law - they are population-level findings and the
// underlying research is contested.
export function acwrBand(acwr: number): AcwrBand {
  if (acwr < 0.8) return "low"
  if (acwr <= 1.3) return "optimal"
  if (acwr <= 1.5) return "caution"
  return "high"
}

export const ACWR_BAND_LABEL: Record<AcwrBand, string> = {
  low: "Detraining",
  optimal: "Sweet spot",
  caution: "Ramping up",
  high: "Spike",
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0)
}

function round(value: number, places: number): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

/**
 * Assumes `points` is sorted ascending and dense - exactly one entry per
 * calendar day, including rest days at load 0. The daily_facts view
 * guarantees this by generating a full calendar; use `densify` first if the
 * series came from somewhere else.
 */
export function computeLoadMetrics(points: DailyLoadPoint[]): LoadMetricsPoint[] {
  const loads = points.map((p) => p.load)

  return points.map((point, i) => {
    const hasAcute = i + 1 >= ACUTE_DAYS
    const hasChronic = i + 1 >= CHRONIC_DAYS

    const acuteWindow = loads.slice(i - ACUTE_DAYS + 1, i + 1)
    const acute = hasAcute ? round(sum(acuteWindow), 1) : null

    const chronic = hasChronic
      ? round(sum(loads.slice(i - CHRONIC_DAYS + 1, i + 1)) / (CHRONIC_DAYS / ACUTE_DAYS), 1)
      : null

    const acwr = acute != null && chronic != null && chronic > 0 ? round(acute / chronic, 2) : null

    // Monotony is undefined when the week has no variation at all (which
    // includes a completely blank week), so it stays null rather than Infinity.
    let monotony: number | null = null
    if (hasAcute) {
      const avg = sum(acuteWindow) / ACUTE_DAYS
      const variance = sum(acuteWindow.map((v) => (v - avg) ** 2)) / ACUTE_DAYS
      const sd = Math.sqrt(variance)
      if (sd > 0) monotony = round(avg / sd, 2)
    }

    const strain = acute != null && monotony != null ? round(acute * monotony, 1) : null

    return { day: point.day, load: point.load, acute, chronic, acwr, monotony, strain }
  })
}

/**
 * Fills missing calendar days with load 0 so the rolling windows above line up
 * with real elapsed time rather than "the last N rows that happened to exist".
 */
export function densify(points: DailyLoadPoint[], from: string, to: string): DailyLoadPoint[] {
  const byDay = new Map(points.map((p) => [p.day, p.load]))
  const out: DailyLoadPoint[] = []
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)

  while (cursor <= end) {
    const day = cursor.toISOString().slice(0, 10)
    out.push({ day, load: byDay.get(day) ?? 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return out
}
