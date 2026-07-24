import { describe, expect, it } from "vitest"
import { aggregateWeeklyLoad, computeSessionLoad } from "@/lib/services/trainingLoad"

describe("computeSessionLoad", () => {
  it("multiplies rpe by duration in hours", () => {
    const load = computeSessionLoad({
      start_time: "2026-05-01T10:00:00.000Z",
      end_time: "2026-05-01T11:30:00.000Z",
      rpe: 6,
    })
    expect(load).toBe(9) // 6 * 1.5h
  })

  it("returns 0 when rpe or end_time is missing", () => {
    expect(
      computeSessionLoad({ start_time: "2026-05-01T10:00:00.000Z", end_time: null, rpe: 6 })
    ).toBe(0)
    expect(
      computeSessionLoad({
        start_time: "2026-05-01T10:00:00.000Z",
        end_time: "2026-05-01T11:00:00.000Z",
        rpe: null,
      })
    ).toBe(0)
  })
})

describe("aggregateWeeklyLoad", () => {
  it("sums load per ISO week (Monday start)", () => {
    const points = aggregateWeeklyLoad([
      { start_time: "2026-05-04T10:00:00.000Z", end_time: "2026-05-04T11:00:00.000Z", rpe: 5 }, // Monday
      { start_time: "2026-05-06T10:00:00.000Z", end_time: "2026-05-06T11:00:00.000Z", rpe: 3 }, // same week
      { start_time: "2026-05-12T10:00:00.000Z", end_time: "2026-05-12T11:00:00.000Z", rpe: 4 }, // next week
    ])

    expect(points).toEqual([
      { weekStart: "2026-05-04", load: 8 },
      { weekStart: "2026-05-11", load: 4 },
    ])
  })
})
