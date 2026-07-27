import { describe, expect, it } from "vitest"
import {
  acwrBand,
  computeLoadMetrics,
  densify,
  intensityCoverage,
  type DailyLoadPoint,
} from "@/lib/services/loadMetrics"

function series(loads: number[], start = "2026-01-01"): DailyLoadPoint[] {
  const cursor = new Date(`${start}T00:00:00Z`)
  return loads.map((load) => {
    const day = cursor.toISOString().slice(0, 10)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
    return { day, load }
  })
}

describe("computeLoadMetrics", () => {
  it("leaves acute null until 7 days of history exist", () => {
    const points = computeLoadMetrics(series([10, 10, 10, 10, 10, 10, 10]))

    expect(points.slice(0, 6).every((p) => p.acute === null)).toBe(true)
    expect(points[6].acute).toBe(70)
  })

  it("leaves chronic and acwr null until 28 days of history exist", () => {
    const points = computeLoadMetrics(series(Array(28).fill(10)))

    expect(points[26].chronic).toBeNull()
    expect(points[26].acwr).toBeNull()
    expect(points[27].chronic).toBe(70) // 280 total / 4 weeks
    expect(points[27].acwr).toBe(1) // steady state
  })

  it("reports acwr above 1 when the last week spikes", () => {
    // 21 days at 10/day, then 7 days at 30/day.
    const points = computeLoadMetrics(series([...Array(21).fill(10), ...Array(7).fill(30)]))
    const last = points[27]

    expect(last.acute).toBe(210) // 7 * 30
    expect(last.chronic).toBe(105) // (210 + 210) / 4
    expect(last.acwr).toBe(2)
    expect(acwrBand(last.acwr!)).toBe("high")
  })

  it("computes monotony as mean over standard deviation of the trailing week", () => {
    // Six rest days and one hard day: high mean-to-SD contrast, low monotony.
    const varied = computeLoadMetrics(series([0, 0, 0, 0, 0, 0, 70]))[6]
    // mean = 10, population SD = sqrt(600) ~ 24.49
    expect(varied.monotony).toBe(0.41)

    // Identical every day: SD is 0, so monotony is undefined rather than Infinity.
    const flat = computeLoadMetrics(series(Array(7).fill(20)))[6]
    expect(flat.monotony).toBeNull()
    expect(flat.strain).toBeNull()
  })

  it("returns null monotony for a completely blank week rather than NaN", () => {
    const blank = computeLoadMetrics(series(Array(7).fill(0)))[6]

    expect(blank.acute).toBe(0)
    expect(blank.monotony).toBeNull()
    expect(blank.strain).toBeNull()
  })

  it("computes strain as acute load times monotony", () => {
    const points = computeLoadMetrics(series([10, 10, 10, 10, 10, 10, 40]))
    const last = points[6]

    expect(last.acute).toBe(100)
    expect(last.strain).toBe(Math.round(100 * last.monotony! * 10) / 10)
  })

  it("returns an empty array for empty input", () => {
    expect(computeLoadMetrics([])).toEqual([])
  })
})

describe("intensityCoverage", () => {
  it("reports the share of sessions backed by real intensity data", () => {
    const summary = intensityCoverage([
      { day: "2026-01-01", load: 10, sessionCount: 2, sessionsWithIntensity: 1 },
      { day: "2026-01-02", load: 0, sessionCount: 0, sessionsWithIntensity: 0 },
      { day: "2026-01-03", load: 20, sessionCount: 2, sessionsWithIntensity: 2 },
    ])

    expect(summary.sessionCount).toBe(4)
    expect(summary.sessionsWithIntensity).toBe(3)
    expect(summary.coverage).toBe(0.75)
    expect(summary.sufficient).toBe(true)
  })

  it("is insufficient when most sessions lack RPE or heart-rate zones", () => {
    // The real situation as of 2026-07: 19 of 74 sessions had usable intensity.
    const summary = intensityCoverage([
      { day: "2026-01-01", load: 100, sessionCount: 74, sessionsWithIntensity: 19 },
    ])

    expect(summary.coverage).toBeCloseTo(0.2568, 4)
    expect(summary.sufficient).toBe(false)
  })

  it("reports null coverage rather than 0 when there are no sessions at all", () => {
    const summary = intensityCoverage([{ day: "2026-01-01", load: 0 }])

    expect(summary.coverage).toBeNull()
    expect(summary.sufficient).toBe(false)
  })
})

describe("densify", () => {
  it("fills missing calendar days with zero load", () => {
    const filled = densify(
      [
        { day: "2026-01-01", load: 12 },
        { day: "2026-01-04", load: 8 },
      ],
      "2026-01-01",
      "2026-01-05"
    )

    expect(filled).toEqual([
      { day: "2026-01-01", load: 12 },
      { day: "2026-01-02", load: 0 },
      { day: "2026-01-03", load: 0 },
      { day: "2026-01-04", load: 8 },
      { day: "2026-01-05", load: 0 },
    ])
  })

  it("crosses a month boundary", () => {
    const filled = densify([], "2026-01-30", "2026-02-02")
    expect(filled.map((p) => p.day)).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ])
  })
})
