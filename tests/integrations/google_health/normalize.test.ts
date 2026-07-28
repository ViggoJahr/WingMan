import { describe, expect, it } from "vitest"
import {
  bucketByDay,
  normalizeBodyFat,
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

    const { session, sessionType, cardioDetail } = normalizeExercise(dp, USER_ID)

    expect(session.start_time).toBe("2026-07-24T15:45:39Z")
    expect(session.end_time).toBe("2026-07-24T16:29:16Z")
    expect(session.external_id).toBe(dp.name)
    // WORKOUT is Google's catch-all, not a claim that this was cardio.
    expect(sessionType).toBe("general_cardio")
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

  it("maps recognised steady-state activities to cardio", () => {
    for (const exerciseType of ["WALKING", "BIKING", "ROWING_MACHINE", "RUNNING"]) {
      const dp = { exercise: { interval: { startTime: "2026-07-24T10:00:00Z" }, exerciseType } }
      expect(normalizeExercise(dp, USER_ID).sessionType).toBe("cardio")
    }
  })

  // Fitbit labelled a real strength session LACROSSE ("Träningspass") and sent
  // powerlifting through as WORKOUT. Calling those "cardio" asserted something
  // false about the training; general_cardio says "unclassified" instead.
  it("maps unrecognised or generic labels to general_cardio", () => {
    for (const exerciseType of ["BASKETBALL", "LACROSSE", "WORKOUT", "SOMETHING_NEW", undefined]) {
      const dp = { exercise: { interval: { startTime: "2026-07-24T10:00:00Z" }, exerciseType } }
      expect(normalizeExercise(dp, USER_ID).sessionType).toBe("general_cardio")
    }
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

  // Confirmed live (2026-07-26): the Fitbit band, Fitbit MobileTrack and the
  // Samsung phone via Health Connect all report the same walking. Summing
  // across them turned ~9,700 real steps into 20,466.
  it("takes the largest source rather than summing duplicate step sources", () => {
    const day = { civilStartTime: { date: { year: 2026, month: 7, day: 23 } } }
    const point = (platform: string, device: Record<string, unknown>, count: string) => ({
      dataSource: { platform, device },
      steps: { interval: day, count },
    })

    const byDay = bucketByDay(
      [
        point("FITBIT", {}, "5000"),
        point("FITBIT", {}, "4719"),
        point("FITBIT", { displayName: "MobileTrack" }, "5373"),
        point("HEALTH_CONNECT", { formFactor: "PHONE", manufacturer: "samsung" }, "5374"),
      ],
      "steps",
      "count",
      "sum"
    )

    // FITBIT band: 5000 + 4719 = 9719, the largest single source.
    expect(byDay.get("2026-07-23")).toBe(9719)
  })

  it("prefers the source with the most samples for averaged metrics", () => {
    const date = { year: 2026, month: 7, day: 25 }
    const point = (platform: string, value: number) => ({
      dataSource: { platform, device: {} },
      oxygenSaturation: { date, percentage: value },
    })

    const byDay = bucketByDay(
      [
        point("FITBIT", 96),
        point("FITBIT", 97),
        point("FITBIT", 98),
        // A single stray reading from another platform must not drag the
        // average down to 81.
        point("HEALTH_CONNECT", 35),
      ],
      "oxygenSaturation",
      "percentage",
      "avg"
    )

    expect(byDay.get("2026-07-25")).toBe(97)
  })

  // Confirmed live: 656 of 5015 SpO2 readings sat at exactly 50.0 - a
  // sentinel, not a measurement - pulling the daily mean to 86.9% against a
  // median of 94%.
  it("discards out-of-range sensor errors and uses the median", () => {
    const date = { year: 2026, month: 7, day: 23 }
    const reading = (v: number) => ({
      dataSource: { platform: "FITBIT", device: {} },
      oxygenSaturation: { date, percentage: v },
    })

    const points = [
      ...Array.from({ length: 10 }, () => reading(50)), // sentinels
      ...Array.from({ length: 21 }, () => reading(97)),
    ]

    const byDay = bucketByDay(points, "oxygenSaturation", "percentage", "median", {
      min: 70,
      max: 100,
      minSamples: 20,
    })

    expect(byDay.get("2026-07-23")).toBe(97)
  })

  it("reports nothing for a day with too few valid readings", () => {
    const date = { year: 2026, month: 7, day: 17 }
    const points = [
      { dataSource: { platform: "FITBIT", device: {} }, oxygenSaturation: { date, percentage: 50 } },
      { dataSource: { platform: "FITBIT", device: {} }, oxygenSaturation: { date, percentage: 99 } },
    ]

    const byDay = bucketByDay(points, "oxygenSaturation", "percentage", "median", {
      min: 70,
      minSamples: 20,
    })

    expect(byDay.has("2026-07-17")).toBe(false)
  })

  it("keeps a single-source day unchanged", () => {
    const points = [
      {
        dataSource: { platform: "FITBIT", device: {} },
        steps: { interval: { civilStartTime: { date: { year: 2026, month: 7, day: 25 } } }, count: "120" },
      },
    ]

    expect(bucketByDay(points, "steps", "count", "sum").get("2026-07-25")).toBe(120)
  })
})
