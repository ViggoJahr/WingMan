import { describe, expect, it } from "vitest"
import { buildInsights, countShortNightStreak, type InsightInput } from "@/lib/services/insights"

/** An unremarkable day: nothing for the card to say. */
const QUIET: InsightInput = {
  acwr: 1.1,
  weeklyLoad: 400,
  restDays: 2,
  readiness: { value: 72, deviation: "normal" },
  sleep: { value: 7.8, deviation: "normal" },
  shortNightStreak: 0,
}

function on(overrides: Partial<InsightInput>): InsightInput {
  return { ...QUIET, ...overrides }
}

describe("buildInsights", () => {
  it("says nothing on an ordinary day", () => {
    // The failure mode this guards against is a permanent slot that has to be
    // filled, which is how "you slept 7h 48m" ends up presented as an insight.
    expect(buildInsights(QUIET)).toEqual([])
  })

  it("leads with the case where load and recovery disagree", () => {
    const insights = buildInsights(
      on({ acwr: 1.45, readiness: { value: 48, deviation: "below" } })
    )

    expect(insights).toHaveLength(1)
    expect(insights[0].key).toBe("load-spike-low-readiness")
    expect(insights[0].tone).toBe("critical")
    // The numbers that justify the claim have to appear in it.
    expect(insights[0].body).toContain("1.45")
    expect(insights[0].body).toContain("48")
  })

  it("falls back to the plain spike when readiness is fine", () => {
    const insights = buildInsights(on({ acwr: 1.8 }))

    expect(insights[0].key).toBe("load-spike")
    expect(insights[0].tone).toBe("warning")
  })

  it("does not fire the combined case on a merely ramping week", () => {
    // 1.45 is "caution" and pairs with low readiness above; on its own it is
    // not a spike and should not produce the standalone warning.
    expect(buildInsights(on({ acwr: 1.45 }))).toEqual([])
  })

  it("stays silent about load when ACWR was withheld for thin coverage", () => {
    expect(buildInsights(on({ acwr: null, weeklyLoad: 2000 }))).toEqual([])
  })

  it("reports a run of short nights", () => {
    const insights = buildInsights(
      on({ shortNightStreak: 4, sleep: { value: 5.5, deviation: "below" } })
    )

    expect(insights[0].key).toBe("sleep-debt")
    expect(insights[0].headline).toContain("4")
  })

  it("does not call two short nights a pattern", () => {
    const insights = buildInsights(
      on({ shortNightStreak: 2, sleep: { value: 5.5, deviation: "below" } })
    )

    expect(insights.map((i) => i.key)).not.toContain("sleep-debt")
  })

  it("flags a week with no rest day", () => {
    expect(buildInsights(on({ restDays: 0 }))[0].key).toBe("no-rest-days")
  })

  it("has good news to give as well as warnings", () => {
    // A system that only ever warns gets ignored.
    const insights = buildInsights(
      on({ acwr: 0.7, readiness: { value: 88, deviation: "above" } })
    )

    expect(insights.map((i) => i.key)).toContain("recovered-and-light")
  })

  it("honours the limit and keeps the most urgent", () => {
    const crowded = on({
      acwr: 1.6,
      restDays: 0,
      readiness: { value: 40, deviation: "below" },
      shortNightStreak: 5,
      sleep: { value: 5, deviation: "below" },
    })

    expect(buildInsights(crowded)).toHaveLength(1)
    expect(buildInsights(crowded)[0].key).toBe("load-spike-low-readiness")
    expect(buildInsights(crowded, { limit: 3 })).toHaveLength(3)
  })
})

describe("countShortNightStreak", () => {
  it("counts back from the most recent night and stops at a normal one", () => {
    expect(countShortNightStreak([8, 8, 5, 5, 5], 6)).toBe(3)
  })

  it("is zero when last night was fine, however bad the week was", () => {
    expect(countShortNightStreak([5, 5, 5, 5, 8], 6)).toBe(0)
  })

  it("breaks the run on a missing night rather than skipping it", () => {
    // Three bad nights either side of a week the ring was not worn is not a
    // run of three, and saying so would be inventing data.
    expect(countShortNightStreak([5, 5, 5, null, 5], 6)).toBe(1)
  })

  it("treats a night exactly at the band floor as normal", () => {
    expect(countShortNightStreak([5, 6], 6)).toBe(0)
  })

  it("handles an empty series", () => {
    expect(countShortNightStreak([], 6)).toBe(0)
  })
})
