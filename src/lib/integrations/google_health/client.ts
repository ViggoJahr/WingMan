const BASE_URL = "https://health.googleapis.com/v4"

// Confirmed live (2026-07-25): each data point nests its payload under a
// top-level key named after the data type - dp.weight, dp.steps,
// dp.exercise, dp.sleep, dp.dailyRestingHeartRate, etc. - not under a
// "data" union field as the docs implied. Int64 fields (count,
// beatsPerMinute, etc.) serialize as strings, not JSON numbers.
export interface GoogleHealthDataPoint {
  name?: string
  dataSource?: { platform?: string; recordingMethod?: string }
  [typeKey: string]: unknown
}

interface CivilDate {
  year: number
  month: number
  day: number
}

function civilDateToIso(date: CivilDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
}

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

// Fetches every page (following nextPageToken) so high-frequency types
// (SpO2 ~1/min, HRV ~1/5min, active-zone-minutes per-minute) aren't
// silently truncated at the first 1000-point page. Points are returned
// newest-first (confirmed live), so pagination stops as soon as a page's
// oldest point falls before `since` - avoids walking the account's full
// history every sync once there's more than one page of data.
async function fetchDataPoints(
  accessToken: string,
  dataType: string,
  opts: { filter?: string; since?: Date } = {}
): Promise<GoogleHealthDataPoint[]> {
  const points: GoogleHealthDataPoint[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`${BASE_URL}/users/me/dataTypes/${dataType}/dataPoints`)
    url.searchParams.set("pageSize", "1000")
    if (opts.filter) url.searchParams.set("filter", opts.filter)
    if (pageToken) url.searchParams.set("pageToken", pageToken)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    })
    if (!res.ok) {
      throw new Error(`Google Health fetch ${dataType} failed: ${res.status} ${await res.text()}`)
    }
    const body = await res.json()
    const page = (body.dataPoints ?? body.dataPoint ?? []) as GoogleHealthDataPoint[]
    points.push(...page)

    pageToken = body.nextPageToken
    if (opts.since && page.length > 0) {
      const oldestOnPage = Math.min(...page.map((dp) => pointTimeMs(dp, dataType) || Infinity))
      if (oldestOnPage < opts.since.getTime()) break
    }
  } while (pageToken)

  return points
}

function sinceFilter(dataType: string, since: Date, timeField: "interval.start_time" | "sample_time.physical_time") {
  return `${dataType}.${timeField} >= "${since.toISOString()}"`
}

// exercise, sleep, and daily-resting-heart-rate reject any filter on their
// interval/sample-time field (400 INVALID_DATA_POINT_FILTER regardless of
// naming) - confirmed live. Fetch everything (paginated) and filter
// client-side for those, rather than keep guessing filter syntax.
async function fetchAndFilterSince(accessToken: string, dataType: string, typeKey: string, since: Date) {
  const points = await fetchDataPoints(accessToken, dataType, { since })
  const sinceMs = since.getTime()
  return points.filter((dp) => pointTimeMs(dp, typeKey) >= sinceMs)
}

export const fetchSteps = (accessToken: string, since: Date) =>
  fetchDataPoints(accessToken, "steps", { filter: sinceFilter("steps", since, "interval.start_time"), since })

export const fetchWeight = (accessToken: string, since: Date) =>
  fetchDataPoints(accessToken, "weight", {
    filter: sinceFilter("weight", since, "sample_time.physical_time"),
    since,
  })

export const fetchExercise = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "exercise", "exercise", since)

export const fetchSleep = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "sleep", "sleep", since)

export const fetchRestingHeartRate = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "daily-resting-heart-rate", "dailyRestingHeartRate", since)

// Newly added (2026-07-25): body fat and height are sample-based like
// weight; HRV, SpO2, and active-zone-minutes are high-frequency and
// bucketed to daily averages/sums downstream in normalize.ts.
export const fetchBodyFat = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "body-fat", "bodyFat", since)

export const fetchHeight = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "height", "height", since)

export const fetchHeartRateVariability = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "heart-rate-variability", "heartRateVariability", since)

export const fetchOxygenSaturation = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "oxygen-saturation", "oxygenSaturation", since)

export const fetchActiveZoneMinutes = (accessToken: string, since: Date) =>
  fetchAndFilterSince(accessToken, "active-zone-minutes", "activeZoneMinutes", since)
