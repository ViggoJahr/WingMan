import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { decrypt, encrypt } from "@/lib/crypto"
import type { IntegrationAccountRow, SourceAdapter, SyncResult } from "../types"
import { refreshAccessToken } from "./auth"
import { fetchExercise, fetchRestingHeartRate, fetchSleep, fetchSteps, fetchWeight } from "./client"
import { bucketByDay, normalizeExercise, normalizeSleep, normalizeWeight } from "./normalize"

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

  const [exercisePoints, sleepPoints, weightPoints, stepsPoints, restingHrPoints] = await Promise.all([
    fetchExercise(tokens.accessToken, since),
    fetchSleep(tokens.accessToken, since),
    fetchWeight(tokens.accessToken, since),
    fetchSteps(tokens.accessToken, since),
    fetchRestingHeartRate(tokens.accessToken, since),
  ])

  for (const dp of exercisePoints) {
    const { session, cardioDetail } = normalizeExercise(dp, userId)
    const { data: sessionRow, error } = await db
      .from("sessions")
      .upsert(session, { onConflict: "external_source,external_id" })
      .select("id")
      .single()
    if (error) throw new Error(`Failed to upsert exercise session: ${error.message}`)
    await db
      .from("cardio_sessions")
      .upsert({ session_id: sessionRow.id, ...cardioDetail }, { onConflict: "session_id" })
    itemsSynced++
  }

  for (const dp of sleepPoints) {
    const { error } = await db
      .from("sleep_logs")
      .upsert(normalizeSleep(dp, userId), { onConflict: "external_source,external_id" })
    if (error) throw new Error(`Failed to upsert sleep log: ${error.message}`)
    itemsSynced++
  }

  for (const dp of weightPoints) {
    const { error } = await db
      .from("body_metrics")
      .upsert(normalizeWeight(dp, userId), { onConflict: "external_source,external_id" })
    if (error) throw new Error(`Failed to upsert body metric: ${error.message}`)
    itemsSynced++
  }

  const stepsByDay = bucketByDay(stepsPoints, "steps")
  const restingHrByDay = bucketByDay(restingHrPoints, "dailyRestingHeartRate")
  const days = new Set([...stepsByDay.keys(), ...restingHrByDay.keys()])
  for (const day of days) {
    const { error } = await db.from("daily_metrics").upsert(
      {
        user_id: userId,
        date: day,
        steps: stepsByDay.get(day) ?? null,
        resting_heart_rate: restingHrByDay.get(day) ?? null,
        external_source: "google_health",
        external_id: day,
      },
      { onConflict: "user_id,external_source,external_id" }
    )
    if (error) throw new Error(`Failed to upsert daily metric: ${error.message}`)
    itemsSynced++
  }

  return { itemsSynced }
}

export const googleHealthAdapter: SourceAdapter = {
  source: "google_health",
  sync,
}
