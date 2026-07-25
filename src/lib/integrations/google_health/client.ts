const BASE_URL = "https://health.googleapis.com/v4"

// Confirmed live (2026-07-25): each data point nests its payload under a
// top-level key named after the data type - dp.weight, dp.steps,
// dp.exercise, dp.sleep, dp.dailyRestingHeartRate - not under a "data"
// union field as the docs implied. Int64 fields (count, beatsPerMinute,
// etc.) serialize as strings, not JSON numbers.
export interface GoogleHealthDataPoint {
  name?: string
  dataSource?: { platform?: string; recordingMethod?: string }
  [typeKey: string]: unknown
}

async function fetchDataPoints(
  accessToken: string,
  dataType: string,
  filter?: string
): Promise<GoogleHealthDataPoint[]> {
  const url = new URL(`${BASE_URL}/users/me/dataTypes/${dataType}/dataPoints`)
  url.searchParams.set("pageSize", "1000")
  if (filter) url.searchParams.set("filter", filter)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  })
  if (!res.ok) {
    throw new Error(`Google Health fetch ${dataType} failed: ${res.status} ${await res.text()}`)
  }
  const body = await res.json()
  return (body.dataPoints ?? body.dataPoint ?? []) as GoogleHealthDataPoint[]
}

function sinceFilter(dataType: string, since: Date, timeField: "interval.start_time" | "sample_time.physical_time") {
  return `${dataType}.${timeField} >= "${since.toISOString()}"`
}

interface CivilDate {
  year: number
  month: number
  day: number
}

function civilDateToIso(date: CivilDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
}

// dailyRestingHeartRate only carries a plain civil date (no time-of-day),
// so this returns midnight UTC for that date - good enough for day-bucketing.
export function pointTimeMs(dp: GoogleHealthDataPoint, typeKey: string): number {
  const payload = dp[typeKey] as Record<string, unknown> | undefined
  if (!payload) return 0

  const interval = payload.interval as { startTime?: string } | undefined
  if (interval?.startTime) return new Date(interval.startTime).getTime()

  const sampleTime = payload.sampleTime as { physicalTime?: string } | undefined
  if (sampleTime?.physicalTime) return new Date(sampleTime.physicalTime).getTime()

  const date = payload.date as CivilDate | undefined
  if (date) return new Date(civilDateToIso(date)).getTime()

  return 0
}

// exercise and sleep reject any filter on their interval field (400
// INVALID_DATA_POINT_FILTER regardless of naming); daily-resting-heart-rate
// rejects filtering on its date field the same way. Fetch everything and
// filter client-side for those, rather than keep guessing filter syntax -
// steps and weight are the only two confirmed to accept server-side filters.
async function fetchAndFilterSince(
  accessToken: string,
  dataType: string,
  typeKey: string,
  since: Date
) {
  const points = await fetchDataPoints(accessToken, dataType)
  const sinceMs = since.getTime()
  return points.filter((dp) => pointTimeMs(dp, typeKey) >= sinceMs)
}

export const fetchSteps = (accessToken: string, since: Date) =>
  fetchDataPoints(accessToken, "steps", sinceFilter("steps", since, "interval.start_time"))

export const fetchWeight = (accessToken: string, since: Date) =>
  fetchDataPoints(accessToken, "weight", sinceFilter("weight", since, "sample_time.physical_time"))

export const fetchExercise = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "exercise", "exercise", since)

export const fetchSleep = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "sleep", "sleep", since)

export const fetchRestingHeartRate = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "daily-resting-heart-rate", "dailyRestingHeartRate", since)
