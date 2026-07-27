import { describe, expect, it } from "vitest"
import {
  clockToVideoTime,
  describeEventTime,
  formatClock,
  formatVideoTime,
  inferPeriod,
  videoTimeToClock,
  type PeriodOffsets,
} from "@/lib/handball/videoClock"

// A real recording: camera rolling 132.5s before throw-off, first half 30 min,
// then a 12-minute halftime that is still in the footage.
// Period 2 throw-off = 132.5 + 1800 + 720 = 2652.5
const OFFSETS: PeriodOffsets = { "1": 132.5, "2": 2652.5 }

describe("inferPeriod", () => {
  it("returns null before the first throw-off, since warm-up is not period 1", () => {
    expect(inferPeriod(OFFSETS, 0)).toBeNull()
    expect(inferPeriod(OFFSETS, 132.4)).toBeNull()
  })

  it("returns period 1 from the throw-off until the second half starts", () => {
    expect(inferPeriod(OFFSETS, 132.5)).toBe(1)
    expect(inferPeriod(OFFSETS, 1000)).toBe(1)
    expect(inferPeriod(OFFSETS, 2652.4)).toBe(1) // still halftime footage
  })

  it("returns period 2 from its own throw-off", () => {
    expect(inferPeriod(OFFSETS, 2652.5)).toBe(2)
    expect(inferPeriod(OFFSETS, 4000)).toBe(2)
  })

  it("returns null when no period has been anchored yet", () => {
    expect(inferPeriod({}, 500)).toBeNull()
  })
})

describe("videoTimeToClock", () => {
  it("reads the clock from the start of the period the position falls in", () => {
    expect(videoTimeToClock(OFFSETS, 132.5)).toEqual({ period: 1, clockSeconds: 0 })
    expect(videoTimeToClock(OFFSETS, 732.5)).toEqual({ period: 1, clockSeconds: 600 }) // 10:00
  })

  it("does not carry period 1's elapsed time into period 2", () => {
    // The whole reason offsets are per-period: a single global offset would put
    // this at 42:00 rather than 0:00 of the second half.
    expect(videoTimeToClock(OFFSETS, 2652.5)).toEqual({ period: 2, clockSeconds: 0 })
    expect(videoTimeToClock(OFFSETS, 3252.5)).toEqual({ period: 2, clockSeconds: 600 })
  })

  it("returns null before the first throw-off and when nothing is anchored", () => {
    expect(videoTimeToClock(OFFSETS, 10)).toBeNull()
    expect(videoTimeToClock({}, 1000)).toBeNull()
  })

  it("never reports a negative clock", () => {
    expect(videoTimeToClock({ "1": 100 }, 100)?.clockSeconds).toBe(0)
  })
})

describe("clockToVideoTime", () => {
  it("round-trips against videoTimeToClock", () => {
    const clock = videoTimeToClock(OFFSETS, 3252.5)!
    expect(clockToVideoTime(OFFSETS, clock.period, clock.clockSeconds)).toBe(3252.5)
  })

  it("returns null for a period that has no anchor", () => {
    expect(clockToVideoTime(OFFSETS, 3, 0)).toBeNull()
    expect(clockToVideoTime({}, 1, 0)).toBeNull()
  })
})

describe("formatVideoTime", () => {
  it("formats under an hour as m:ss", () => {
    expect(formatVideoTime(0)).toBe("0:00")
    expect(formatVideoTime(65)).toBe("1:05")
    expect(formatVideoTime(600)).toBe("10:00")
  })

  it("formats past an hour as h:mm:ss, which a full match recording reaches", () => {
    expect(formatVideoTime(3661)).toBe("1:01:01")
  })

  it("shows a dash rather than NaN for a missing position", () => {
    expect(formatVideoTime(null)).toBe("-")
    expect(formatVideoTime(Number.NaN)).toBe("-")
  })
})

describe("formatClock", () => {
  it("reads like the hall scoreboard", () => {
    expect(formatClock(2, 1122)).toBe("2 - 18:42")
    expect(formatClock(1, 5)).toBe("1 - 0:05")
  })
})

describe("describeEventTime", () => {
  it("prefers the stored clock, which is what a corrected offset rewrites", () => {
    expect(describeEventTime(OFFSETS, 999, 2, 1122)).toBe("2 - 18:42")
  })

  it("derives the clock when only a video offset was stored", () => {
    expect(describeEventTime(OFFSETS, 3252.5, null, null)).toBe("2 - 10:00")
  })

  it("falls back to the raw video position when no period covers it", () => {
    expect(describeEventTime(OFFSETS, 60, null, null)).toBe("1:00")
  })

  it("shows a dash for a backfilled event that has no time at all", () => {
    expect(describeEventTime(OFFSETS, null, null, null)).toBe("-")
  })
})
