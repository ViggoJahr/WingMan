import { describe, expect, it } from "vitest"
import {
  bucketByDay,
  normalizeBodyFat,
  normalizeExercise,
  normalizeHeight,
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

    const { session, sessionType, cardioDetail } = normalizeExercise(dp, USER_ID)

    expect(session.start_time).toBe("2026-07-24T15:45:39Z")
    expect(session.end_time).toBe("2026-07-24T16:29:16Z")
    expect(session.external_id).toBe(dp.name)
    expect(sessionType).toBe("cardio")
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

  it("maps STRENGTH_TRAINING to strength_power, not cardio", () => {
    const dp = { exercise: { interval: { startTime: "2026-07-24T10:00:00Z" }, exerciseType: "STRENGTH_TRAINING" } }
    const { sessionType, session } = normalizeExercise(dp, USER_ID)
    expect(sessionType).toBe("strength_power")
    expect(session.type).toBe("strength_power")
  })

  it("maps HANDBALL to handball, not cardio", () => {
    const dp = { exercise: { interval: { startTime: "2026-07-24T10:00:00Z" }, exerciseType: "HANDBALL" } }
    const { sessionType } = normalizeExercise(dp, USER_ID)
    expect(sessionType).toBe("handball")
  })

  it("falls back to cardio for other sports (e.g. basketball)", () => {
    const dp = { exercise: { interval: { startTime: "2026-07-24T10:00:00Z" }, exerciseType: "BASKETBALL" } }
    const { sessionType } = normalizeExercise(dp, USER_ID)
    expect(sessionType).toBe("cardio")
  })

  it("extracts calories, active duration, active zone minutes, and HR zones", () => {
    const dp = {
      exercise: {
        interval: { startTime: "2026-07-24T15:45:39Z", endTime: "2026-07-24T16:29:16Z" },
        exerciseType: "WORKOUT",
        activeDuration: "2616.689s",
        metricsSummary: {
          caloriesKcal: 465,
          activeZoneMinutes: "62",
          heartRateZoneDurations: {
            lightTime: "60s",
            moderateTime: "1380s",
            vigorousTime: "1200s",
            peakTime: "0s",
          },
        },
      },
    }
    const { session } = normalizeExercise(dp, USER_ID)
    expect(session.calories_kcal).toBe(465)
    expect(session.active_duration_seconds).toBe(2617)
    expect(session.active_zone_minutes).toBe(62)
    expect(session.hr_zones).toEqual({
      light_sec: 60,
      moderate_sec: 1380,
      vigorous_sec: 1200,
      peak_sec: 0,
    })
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

describe("normalizeBodyFat", () => {
  it("extracts percentage and civil date", () => {
    const dp = {
      bodyFat: {
        sampleTime: { civilTime: { date: { year: 2026, month: 7, day: 25 } } },
        percentage: 17.7,
      },
    }
    const result = normalizeBodyFat(dp, USER_ID)
    expect(result.body_fat_percentage).toBe(17.7)
    expect(result.date).toBe("2026-07-25")
  })
})

describe("normalizeHeight", () => {
  it("converts millimeters (as a string) to cm", () => {
    const dp = {
      height: {
        sampleTime: { civilTime: { date: { year: 2026, month: 6, day: 6 } } },
        heightMillimeters: "1780",
      },
    }
    const result = normalizeHeight(dp, USER_ID)
    expect(result.height_cm).toBe(178)
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
    const byDay = bucketByDay(points, "steps", "count", "sum")
    expect(byDay.get("2026-07-25")).toBe(100)
  })

  it("averages repeated point-in-time samples (e.g. HRV) per day", () => {
    const points = [
      { heartRateVariability: { date: { year: 2026, month: 7, day: 25 }, rootMeanSquareOfSuccessiveDifferencesMilliseconds: 70 } },
      { heartRateVariability: { date: { year: 2026, month: 7, day: 25 }, rootMeanSquareOfSuccessiveDifferencesMilliseconds: 80 } },
    ]
    const byDay = bucketByDay(points, "heartRateVariability", "rootMeanSquareOfSuccessiveDifferencesMilliseconds", "avg")
    expect(byDay.get("2026-07-25")).toBe(75)
  })
})
