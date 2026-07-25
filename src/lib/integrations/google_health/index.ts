import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { decrypt, encrypt } from "@/lib/crypto"
import type { IntegrationAccountRow, SourceAdapter, SyncResult } from "../types"
import { refreshAccessToken } from "./auth"
import {
  fetchActiveZoneMinutes,
  fetchBodyFat,
  fetchExercise,
  fetchHeartRateVariability,
  fetchHeight,
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
  normalizeHeight,
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

  await db
    .from("integration_accounts")
    .update({
      access_token: encrypt(tokens.accessToken),
      // Google doesn't always rotate the refresh token - keep the old one if none returned.
      refresh_token: tokens.refreshToken ? encrypt(tokens.refreshToken) : account.refresh_token,
      expires_at: tokens.expiresAt,
    })
    .eq("id", account.id)

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
    { label: "height", fetch: () => fetchHeight(tokens.accessToken, since) },
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
    if (sessionType !== "cardio") await db.from("cardio_sessions").delete().eq("session_id", sessionRow.id)
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
  for (const dp of results.height) {
    const { error } = await db
      .from("body_metrics")
      .upsert(normalizeHeight(dp, userId), { onConflict: "user_id,date" })
    if (error) throw new Error(`Failed to upsert height: ${error.message}`)
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
  const spo2ByDay = bucketByDay(results.spo2, "oxygenSaturation", "percentage", "avg")
  const azmByDay = bucketByDay(results.activeZoneMinutes, "activeZoneMinutes", "activeZoneMinutes", "sum")

  const days = new Set([
    ...stepsByDay.keys(),
    ...restingHrByDay.keys(),
    ...hrvByDay.keys(),
    ...spo2ByDay.keys(),
    ...azmByDay.keys(),
  ])
  for (const day of days) {
    const { error } = await db.from("daily_metrics").upsert(
      {
        user_id: userId,
        date: day,
        steps: stepsByDay.get(day) ?? null,
        resting_heart_rate: restingHrByDay.get(day) ?? null,
        avg_hrv_ms: hrvByDay.get(day) ?? null,
        avg_spo2_percentage: spo2ByDay.get(day) ?? null,
        active_zone_minutes: azmByDay.get(day) ?? null,
        external_source: "google_health",
        external_id: day,
      },
      { onConflict: "user_id,external_source,external_id" }
    )
    if (error) throw new Error(`Failed to upsert daily metric: ${error.message}`)
    itemsSynced++
  }

  return { itemsSynced, warnings: warnings.length > 0 ? warnings : undefined }
}

export const googleHealthAdapter: SourceAdapter = {
  source: "google_health",
  sync,
}
