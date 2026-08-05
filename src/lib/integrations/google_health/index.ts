import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, TablesInsert } from "@/lib/supabase/types"
import { decrypt, encrypt } from "@/lib/crypto"
import type { IntegrationAccountRow, SourceAdapter, SyncResult } from "../types"
import { refreshAccessToken } from "./auth"
import {
  fetchActiveZoneMinutes,
  fetchBodyFat,
  fetchExercise,
  fetchHeartRateVariability,
  fetchOxygenSaturation,
  fetchRestingHeartRate,
  fetchSleep,
  fetchSteps,
  fetchWeight,
} from "./client"
import {
  bucketByDay,
  normalizeBodyFat,
  normalizeExercise,
  normalizeSleep,
  normalizeWeight,
} from "./normalize"

const SYNC_WINDOW_DAYS = 30

async function sync(
  account: IntegrationAccountRow,
  db: SupabaseClient<Database>
): Promise<SyncResult> {
  const refreshToken = decrypt(account.refresh_token!)
  const tokens = await refreshAccessToken(refreshToken)

  // Unlike TUGG, a lost write here is survivable: Google does not rotate the
  // refresh token, so the stored one stays valid and the next run simply
  // refreshes again. It is still worth failing on, because a persistent write
  // failure means the access token and expiry are drifting from reality and the
  // run below is about to do a lot of work on that basis.
  const { error: persistErr } = await db
    .from("integration_accounts")
    .update({
      access_token: encrypt(tokens.accessToken),
      // Google doesn't always rotate the refresh token - keep the old one if none returned.
      refresh_token: tokens.refreshToken ? encrypt(tokens.refreshToken) : account.refresh_token,
      expires_at: tokens.expiresAt,
    })
    .eq("id", account.id)

  if (persistErr) {
    throw new Error(`Google Health token refreshed but could not be saved: ${persistErr.message}`)
  }

  const userId = account.user_id
  const since = new Date(Date.now() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  let itemsSynced = 0
  const warnings: string[] = []

  // Fetch each data type independently - one type erroring shouldn't
  // discard everything else that succeeded.
  const dataTypes = [
    { label: "exercise", fetch: () => fetchExercise(tokens.accessToken, since) },
    { label: "sleep", fetch: () => fetchSleep(tokens.accessToken, since) },
    { label: "weight", fetch: () => fetchWeight(tokens.accessToken, since) },
    { label: "bodyFat", fetch: () => fetchBodyFat(tokens.accessToken, since) },
    // Height is deliberately not synced: it is recorded once and effectively
    // never changes, so the source record always falls outside the sync window
    // (0 of 24 body_metrics rows ever received one). It is a profile field
    // entered in Settings instead - see users.height_cm.
    { label: "steps", fetch: () => fetchSteps(tokens.accessToken, since) },
    { label: "restingHeartRate", fetch: () => fetchRestingHeartRate(tokens.accessToken, since) },
    { label: "hrv", fetch: () => fetchHeartRateVariability(tokens.accessToken, since) },
    { label: "spo2", fetch: () => fetchOxygenSaturation(tokens.accessToken, since) },
    { label: "activeZoneMinutes", fetch: () => fetchActiveZoneMinutes(tokens.accessToken, since) },
  ] as const

  const settled = await Promise.allSettled(dataTypes.map((d) => d.fetch()))
  const results: Record<string, Awaited<ReturnType<(typeof dataTypes)[number]["fetch"]>>> = {}
  settled.forEach((result, i) => {
    const label = dataTypes[i].label
    if (result.status === "fulfilled") {
      results[label] = result.value
    } else {
      results[label] = []
      warnings.push(`${label}: ${result.reason?.message ?? result.reason}`)
    }
  })

  // Exercise -> sessions + whichever subtype table matches the (now
  // correctly mapped) type: strength/cardio/handball.
  for (const dp of results.exercise) {
    const { sessionType, session, cardioDetail, strengthDetail } = normalizeExercise(dp, userId)
    const { data: sessionRow, error } = await db
      .from("sessions")
      .upsert(session, { onConflict: "external_source,external_id" })
      .select("id")
      .single()
    if (error) throw new Error(`Failed to upsert exercise session: ${error.message}`)

    // A prior sync (before the exerciseType mapping fix) may have created a
    // subtype row that no longer matches this session's corrected type -
    // clear whichever ones don't apply before writing the current one.
    // general_cardio shares cardio_sessions: the focus/distance/avg-HR detail
    // is still worth keeping for an unclassified activity.
    const usesCardioDetail = sessionType === "cardio" || sessionType === "general_cardio"
    if (!usesCardioDetail) await db.from("cardio_sessions").delete().eq("session_id", sessionRow.id)
    if (sessionType !== "strength_power")
      await db.from("strength_sessions").delete().eq("session_id", sessionRow.id)
    if (sessionType !== "handball") await db.from("handball_sessions").delete().eq("session_id", sessionRow.id)

    if (sessionType === "strength_power") {
      await db
        .from("strength_sessions")
        .upsert({ session_id: sessionRow.id, ...strengthDetail }, { onConflict: "session_id" })
    } else if (sessionType === "handball") {
      // Auto-detected, unclassified - subtype/comments left for a future
      // manual step where this session gets attached from the practice/
      // match log forms instead of creating a duplicate entry.
      await db
        .from("handball_sessions")
        .upsert(
          { session_id: sessionRow.id, subtype: "individual" },
          { onConflict: "session_id" }
        )
    } else {
      await db
        .from("cardio_sessions")
        .upsert({ session_id: sessionRow.id, ...cardioDetail }, { onConflict: "session_id" })
    }
    itemsSynced++
  }

  for (const dp of results.sleep) {
    const { error } = await db
      .from("sleep_logs")
      .upsert(normalizeSleep(dp, userId), { onConflict: "external_source,external_id" })
    if (error) throw new Error(`Failed to upsert sleep log: ${error.message}`)
    itemsSynced++
  }

  // Weight, body fat, and height all land on the same body_metrics row per
  // day (onConflict user_id+date) rather than one row per data point.
  for (const dp of results.weight) {
    const { error } = await db
      .from("body_metrics")
      .upsert(normalizeWeight(dp, userId), { onConflict: "user_id,date" })
    if (error) throw new Error(`Failed to upsert weight: ${error.message}`)
    itemsSynced++
  }
  for (const dp of results.bodyFat) {
    const { error } = await db
      .from("body_metrics")
      .upsert(normalizeBodyFat(dp, userId), { onConflict: "user_id,date" })
    if (error) throw new Error(`Failed to upsert body fat: ${error.message}`)
    itemsSynced++
  }

  const stepsByDay = bucketByDay(results.steps, "steps", "count", "sum")
  const restingHrByDay = bucketByDay(results.restingHeartRate, "dailyRestingHeartRate", "beatsPerMinute", "avg")
  const hrvByDay = bucketByDay(
    results.hrv,
    "heartRateVariability",
    "rootMeanSquareOfSuccessiveDifferencesMilliseconds",
    "avg"
  )
  // Fitbit's SpO2 stream is noisy and emits a literal 50 as a "no valid
  // reading" sentinel - 656 of 5015 readings (13%) sat at exactly 50.0, which
  // dragged the daily mean to 86.9% against a median of 94%. Values below 70%
  // are discarded as sensor error (they are not survivable while awake and
  // walking around), the median is used instead of the mean so the remaining
  // noise cannot move the result much, and a day needs a real sample count
  // before it reports anything at all.
  const spo2ByDay = bucketByDay(results.spo2, "oxygenSaturation", "percentage", "median", {
    min: 70,
    max: 100,
    minSamples: 20,
  })
  const azmByDay = bucketByDay(results.activeZoneMinutes, "activeZoneMinutes", "activeZoneMinutes", "sum")

  // Each metric is written only on the days it actually produced a value.
  // Sending `?? null` for the others would push nulls over good data whenever a
  // fetch failed: allSettled degrades the run to `partial` and leaves that
  // metric's map empty, which used to blank the column across the whole 30-day
  // window. Omitting a column keeps it out of the ON CONFLICT SET list, so the
  // stored value survives.
  const metricSeries: Array<{
    column: "steps" | "resting_heart_rate" | "avg_hrv_ms" | "avg_spo2_percentage" | "active_zone_minutes"
    byDay: Map<string, number>
  }> = [
    { column: "steps", byDay: stepsByDay },
    { column: "resting_heart_rate", byDay: restingHrByDay },
    { column: "avg_hrv_ms", byDay: hrvByDay },
    { column: "avg_spo2_percentage", byDay: spo2ByDay },
    { column: "active_zone_minutes", byDay: azmByDay },
  ]

  const days = new Set(metricSeries.flatMap(({ byDay }) => [...byDay.keys()]))
  for (const day of days) {
    const row: TablesInsert<"daily_metrics"> = {
      user_id: userId,
      date: day,
      external_source: "google_health",
      external_id: day,
    }
    for (const { column, byDay } of metricSeries) {
      const value = byDay.get(day)
      if (value != null) row[column] = value
    }

    const { error } = await db
      .from("daily_metrics")
      .upsert(row, { onConflict: "user_id,external_source,external_id" })
    if (error) throw new Error(`Failed to upsert daily metric: ${error.message}`)
    itemsSynced++
  }

  return { itemsSynced, warnings: warnings.length > 0 ? warnings : undefined }
}

export const googleHealthAdapter: SourceAdapter = {
  source: "google_health",
  sync,
}
