import { describe, expect, it } from "vitest"
import {
  bucketByDay,
  normalizeExercise,
  normalizeSleep,
  normalizeWeight,
} from "@/lib/integrations/google_health/normalize"

// Fixtures mirror the confirmed live response shape (2026-07-25): each type
// nests under a top-level key named after itself, and int64 fields
// (count, beatsPerMinute, averageHeartRateBeatsPerMinute) serialize as
// strings rather than JSON numbers.
const USER_ID = "user-fixture-id"

describe("normalizeExercise", () => {
  it("extracts interval, focus, and heart rate from the real shape", () => {
    const dp = {
      name: "users/123/dataTypes/exercise/dataPoints/abc",
      exercise: {
        interval: { startTime: "2026-07-24T15:45:39Z", endTime: "2026-07-24T16:29:16Z" },
        exerciseType: "WORKOUT",
        displayName: "Spinning",
        metricsSummary: { averageHeartRateBeatsPerMinute: "137" },
      },
    }

    const { session, cardioDetail } = normalizeExercise(dp, USER_ID)

    expect(session.start_time).toBe("2026-07-24T15:45:39Z")
    expect(session.end_time).toBe("2026-07-24T16:29:16Z")
    expect(session.external_id).toBe(dp.name)
    expect(cardioDetail.focus).toBe("Spinning")
    expect(cardioDetail.avg_hr).toBe(137)
  })

  it("falls back to exerciseType when displayName is absent", () => {
    const dp = {
      exercise: {
        interval: { startTime: "2026-07-24T10:00:00Z" },
        exerciseType: "RUN",
      },
    }
    const { cardioDetail } = normalizeExercise(dp, USER_ID)
    expect(cardioDetail.focus).toBe("RUN")
  })
})

describe("normalizeSleep", () => {
  it("computes duration in minutes from the interval", () => {
    const dp = {
      name: "users/123/dataTypes/sleep/dataPoints/xyz",
      sleep: {
        interval: { startTime: "2026-07-24T22:14:00Z", endTime: "2026-07-25T06:31:00Z" },
        stages: [{ type: "AWAKE" }],
      },
    }
    const result = normalizeSleep(dp, USER_ID)
    expect(result.duration_minutes).toBe(497)
    expect(result.start_time).toBe("2026-07-24T22:14:00Z")
  })
})

describe("normalizeWeight", () => {
  it("converts grams to kg and prefers the civil date", () => {
    const dp = {
      name: "users/123/dataTypes/weight/dataPoints/def",
      weight: {
        sampleTime: {
          physicalTime: "2026-07-24T22:00:00Z",
          civilTime: { date: { year: 2026, month: 7, day: 25 } },
        },
        weightGrams: 78200,
      },
    }
    const result = normalizeWeight(dp, USER_ID)
    expect(result.weight_kg).toBe(78.2)
    expect(result.date).toBe("2026-07-25") // civil date, not the UTC physicalTime date
  })
})

describe("bucketByDay", () => {
  it("sums step counts (string int64) per civil day", () => {
    const points = [
      {
        steps: {
          interval: { civilStartTime: { date: { year: 2026, month: 7, day: 25 } } },
          count: "39",
        },
      },
      {
        steps: {
          interval: { civilStartTime: { date: { year: 2026, month: 7, day: 25 } } },
          count: "61",
        },
      },
    ]
    const byDay = bucketByDay(points, "steps", "count")
    expect(byDay.get("2026-07-25")).toBe(100)
  })

  it("takes the latest value (not a sum) for resting heart rate", () => {
    const points = [
      { dailyRestingHeartRate: { date: { year: 2026, month: 7, day: 25 }, beatsPerMinute: "54" } },
    ]
    const byDay = bucketByDay(points, "dailyRestingHeartRate", "beatsPerMinute")
    expect(byDay.get("2026-07-25")).toBe(54)
  })
})
