import { describe, expect, it } from "vitest"
import { DEFAULT_RANGE, fetchDaysFor, parseRange, rangeDays } from "@/lib/timeRange"

describe("parseRange", () => {
  it("accepts the known keys", () => {
    expect(parseRange("3m")).toBe("3m")
    expect(parseRange("1y")).toBe("1y")
  })

  it("falls back to the default for anything else", () => {
    // These arrive as a hand-editable search param, so an unknown value has to
    // degrade to a window rather than reaching a query as a NaN day count.
    expect(parseRange("nonsense")).toBe(DEFAULT_RANGE)
    expect(parseRange(undefined)).toBe(DEFAULT_RANGE)
    expect(parseRange(null)).toBe(DEFAULT_RANGE)
    expect(parseRange("")).toBe(DEFAULT_RANGE)
  })
})

describe("fetchDaysFor", () => {
  it("reaches back past the displayed window by a full baseline", () => {
    // The point of the helper: 30 days shown against a band built from those
    // same 30 days would make today part of the average it is compared to,
    // flattening every verdict toward "normal".
    expect(fetchDaysFor("30d", 60)).toBe(90)
    expect(fetchDaysFor("1y", 60)).toBe(425)
  })

  it("agrees with rangeDays about the displayed span", () => {
    expect(fetchDaysFor("3m", 0)).toBe(rangeDays("3m"))
  })
})
