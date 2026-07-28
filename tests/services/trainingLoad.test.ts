import { describe, expect, it } from "vitest"
import { aggregateWeeklyLoad } from "@/lib/services/trainingLoad"

describe("aggregateWeeklyLoad", () => {
  it("sums daily load per ISO week (Monday start)", () => {
    const points = aggregateWeeklyLoad([
      { day: "2026-05-04", load: 5 }, // Monday
      { day: "2026-05-06", load: 3 }, // same week
      { day: "2026-05-12", load: 4 }, // next week
    ])

    expect(points).toEqual([
      { weekStart: "2026-05-04", load: 8 },
      { weekStart: "2026-05-11", load: 4 },
    ])
  })

  it("puts Sunday in the week that started the Monday before, not the one after", () => {
    expect(aggregateWeeklyLoad([{ day: "2026-05-10", load: 2 }])).toEqual([
      { weekStart: "2026-05-04", load: 2 },
    ])
  })

  it("keeps rest days out of the output rather than emitting zero-load weeks", () => {
    const points = aggregateWeeklyLoad([
      { day: "2026-05-04", load: 0 },
      { day: "2026-05-05", load: 6 },
    ])

    expect(points).toEqual([{ weekStart: "2026-05-04", load: 6 }])
  })

  it("returns an empty array for no days at all", () => {
    expect(aggregateWeeklyLoad([])).toEqual([])
  })

  it("ignores a non-finite load rather than poisoning the whole week with NaN", () => {
    const points = aggregateWeeklyLoad([
      { day: "2026-05-04", load: Number.NaN },
      { day: "2026-05-05", load: 7 },
    ])

    expect(points).toEqual([{ weekStart: "2026-05-04", load: 7 }])
  })

  it("rounds to one decimal, since tiered estimates are fractional", () => {
    const points = aggregateWeeklyLoad([
      { day: "2026-05-04", load: 1.15 },
      { day: "2026-05-05", load: 2.2 },
    ])

    expect(points).toEqual([{ weekStart: "2026-05-04", load: 3.4 }])
  })
})
