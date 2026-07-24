const BASE_URL = "https://health.googleapis.com/v4"

export interface GoogleHealthDataPoint {
  name?: string
  interval?: { startTime?: string; endTime?: string }
  sampleTime?: { physicalTime?: string }
  data?: Record<string, unknown>
  [key: string]: unknown
}

// The exact response shape is unconfirmed from docs alone (this API reached
// GA in May 2026) - defensively check both plausible list-field names, and
// always keep the raw point so normalize.ts can be corrected against real
// payloads without re-fetching, same mitigation used for the TUGG adapter.
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

export const fetchSteps = (accessToken: string, since: Date) =>
  fetchDataPoints(accessToken, "steps", sinceFilter("steps", since, "interval.start_time"))

export const fetchExercise = (accessToken: string, since: Date) =>
  fetchDataPoints(accessToken, "exercise", sinceFilter("exercise", since, "interval.start_time"))

export const fetchSleep = (accessToken: string, since: Date) =>
  fetchDataPoints(accessToken, "sleep", sinceFilter("sleep", since, "interval.start_time"))

export const fetchWeight = (accessToken: string, since: Date) =>
  fetchDataPoints(accessToken, "weight", sinceFilter("weight", since, "sample_time.physical_time"))

export const fetchRestingHeartRate = (accessToken: string, since: Date) =>
  fetchDataPoints(
    accessToken,
    "daily-resting-heart-rate",
    sinceFilter("dailyRestingHeartRate", since, "sample_time.physical_time")
  )
