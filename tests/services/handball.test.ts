import { describe, expect, it } from "vitest"
import { throwLoad, type PracticeSummary } from "@/lib/services/handball"

const NOW = new Date("2026-07-28T12:00:00Z")

function practice(daysAgo: number, throws: number | null): PracticeSummary {
  return {
    session_id: `s-${daysAgo}`,
    start_time: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
    rpe: 14,
    practice_focus: "Shooting",
    tactical_complexity: null,
    throws_count: throws,
    position: "left_back",
  }
}

describe("throwLoad", () => {
  it("sums throws inside the window and ignores everything older", () => {
    const rolling = [practice(1, 110), practice(3, 55), practice(10, 110)]
    expect(throwLoad(rolling, 7, NOW)).toBe(165) // 110 + 55; the 10-day-old one is out
    expect(throwLoad(rolling, 28, NOW)).toBe(275)
  })

  it("treats an unlogged session as zero rather than NaN", () => {
    // throws_count is null for every session logged before the band existed.
    expect(throwLoad([practice(1, null), practice(2, 55)], 7, NOW)).toBe(55)
  })

  it("returns 0 for no practices at all", () => {
    expect(throwLoad([], 7, NOW)).toBe(0)
  })

  it("counts a session exactly on the boundary", () => {
    expect(throwLoad([practice(7, 55)], 7, NOW)).toBe(55)
  })
})
