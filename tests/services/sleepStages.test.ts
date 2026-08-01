import { describe, expect, it } from "vitest"
import {
  formatMinutes,
  hasStageDetail,
  summariseSleepStages,
  SLEEP_STAGES,
  SLEEP_STAGE_FILL,
  SLEEP_STAGE_LABELS,
} from "@/lib/services/sleepStages"

function segment(type: string, startIso: string, endIso: string) {
  return {
    type,
    startTime: startIso,
    endTime: endIso,
    startUtcOffset: "7200s",
    endUtcOffset: "7200s",
  }
}

/** Shaped exactly like a real row read from sleep_logs.sleep_stages. */
const REAL_NIGHT = [
  segment("AWAKE", "2026-07-30T21:35:00Z", "2026-07-30T21:43:30Z"), // 8.5m
  segment("LIGHT", "2026-07-30T21:43:30Z", "2026-07-30T21:52:30Z"), // 9m
  segment("AWAKE", "2026-07-30T21:52:30Z", "2026-07-30T22:01:30Z"), // 9m
  segment("LIGHT", "2026-07-30T22:01:30Z", "2026-07-30T22:16:30Z"), // 15m
  segment("DEEP", "2026-07-30T22:16:30Z", "2026-07-30T22:18:00Z"), // 1.5m
  segment("REM", "2026-07-30T22:18:00Z", "2026-07-30T22:48:00Z"), // 30m
]

describe("summariseSleepStages", () => {
  it("sums each stage from the segment list", () => {
    const { minutes } = summariseSleepStages(REAL_NIGHT)
    expect(minutes.awake).toBe(18) // 8.5 + 9, rounded
    expect(minutes.light).toBe(24) // 9 + 15
    expect(minutes.deep).toBe(2) // 1.5, rounded
    expect(minutes.rem).toBe(30)
  })

  it("counts awake as time in bed but not as sleep", () => {
    const result = summariseSleepStages(REAL_NIGHT)
    expect(result.asleepMinutes).toBe(56) // rem + light + deep
    expect(result.inBedMinutes).toBe(74) // + awake
  })

  it("reports efficiency as asleep over time in bed", () => {
    const { efficiency } = summariseSleepStages(REAL_NIGHT)
    expect(efficiency).toBeCloseTo(56 / 74, 5)
  })

  it("returns zeros rather than throwing for a missing or malformed column", () => {
    for (const input of [null, undefined, {}, "not json", 42, []]) {
      const result = summariseSleepStages(input)
      expect(result.asleepMinutes).toBe(0)
      expect(result.efficiency).toBeNull()
      expect(hasStageDetail(result)).toBe(false)
    }
  })

  it("drops unknown stage types instead of guessing a bucket", () => {
    // An unrecognised segment inflating "light" would be worse than a total
    // that is honestly short.
    const result = summariseSleepStages([
      segment("LIGHT", "2026-07-30T22:00:00Z", "2026-07-30T22:30:00Z"),
      segment("SOMETHING_NEW", "2026-07-30T22:30:00Z", "2026-07-30T23:30:00Z"),
    ])
    expect(result.minutes.light).toBe(30)
    expect(result.asleepMinutes).toBe(30)
  })

  it("treats the device-specific awake spellings as awake", () => {
    const result = summariseSleepStages([
      segment("OUT_OF_BED", "2026-07-30T22:00:00Z", "2026-07-30T22:10:00Z"),
      segment("WAKE", "2026-07-30T22:10:00Z", "2026-07-30T22:20:00Z"),
    ])
    expect(result.minutes.awake).toBe(20)
    expect(result.asleepMinutes).toBe(0)
  })

  it("ignores segments with a backwards or zero-length interval", () => {
    const result = summariseSleepStages([
      segment("DEEP", "2026-07-30T23:00:00Z", "2026-07-30T22:00:00Z"),
      segment("DEEP", "2026-07-30T22:00:00Z", "2026-07-30T22:00:00Z"),
      segment("DEEP", "2026-07-30T22:00:00Z", "2026-07-30T22:30:00Z"),
    ])
    expect(result.minutes.deep).toBe(30)
  })

  it("ignores segments missing their timestamps", () => {
    const result = summariseSleepStages([{ type: "DEEP" }, { type: "REM", startTime: "x" }])
    expect(result.inBedMinutes).toBe(0)
  })

  it("handles a nap, not just a full night", () => {
    // A real row: 14.5m light + 16.5m deep. Each stage rounds to 15 and 17, so
    // the total is 32 rather than the 31 the raw sum would give - see below.
    const result = summariseSleepStages([
      segment("LIGHT", "2026-07-31T12:54:00Z", "2026-07-31T13:08:30Z"),
      segment("DEEP", "2026-07-31T13:08:30Z", "2026-07-31T13:25:00Z"),
    ])
    expect(result.minutes.light).toBe(15)
    expect(result.minutes.deep).toBe(17)
    expect(result.efficiency).toBe(1)
  })

  it("makes the parts add up to the total, rounding stages before summing", () => {
    // These are rendered as a stacked bar with the total beside it. Summing raw
    // and rounding once would show segments of 15 and 17 against a total of 31,
    // which reads as a bug. Rounding each stage first costs at most a minute of
    // precision and keeps the arithmetic on screen honest.
    const result = summariseSleepStages([
      segment("LIGHT", "2026-07-31T12:54:00Z", "2026-07-31T13:08:30Z"),
      segment("DEEP", "2026-07-31T13:08:30Z", "2026-07-31T13:25:00Z"),
      segment("AWAKE", "2026-07-31T13:25:00Z", "2026-07-31T13:32:30Z"),
    ])
    const { minutes, asleepMinutes, inBedMinutes } = result
    expect(minutes.rem + minutes.light + minutes.deep).toBe(asleepMinutes)
    expect(asleepMinutes + minutes.awake).toBe(inBedMinutes)
  })
})

describe("stage vocabulary", () => {
  it("labels and fills every stage", () => {
    for (const stage of SLEEP_STAGES) {
      expect(SLEEP_STAGE_LABELS[stage]).toBeTruthy()
      expect(SLEEP_STAGE_FILL[stage]).toBeTruthy()
    }
  })

  it("orders stages shallow to deep, which is how they stack", () => {
    expect([...SLEEP_STAGES]).toEqual(["awake", "rem", "light", "deep"])
  })
})

describe("formatMinutes", () => {
  it("writes hours and minutes above an hour", () => {
    expect(formatMinutes(442)).toBe("7h 22m")
    expect(formatMinutes(60)).toBe("1h 0m")
  })

  it("writes minutes only below an hour", () => {
    expect(formatMinutes(45)).toBe("45m")
    expect(formatMinutes(0)).toBe("0m")
  })
})
