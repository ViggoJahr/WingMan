"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { decrypt } from "@/lib/crypto"
import { refreshAccessToken } from "@/lib/integrations/google_health/auth"
import { fetchHeartRateRollup, type HeartRateRollupBucket } from "@/lib/integrations/google_health/client"

/**
 * The session's heart-rate timeline, fetched once and cached forever.
 *
 * A finished session's heart rate cannot change, so this used to spend a fresh
 * OAuth token exchange plus a Google rollUp POST on every single page view for
 * data that was already known. It now reads `sessions.hr_timeline` and only
 * calls Google when that has never been populated.
 *
 * `hr_timeline_fetched_at` is what makes the negative case cacheable too:
 * without it, a session Google has no samples for would be re-fetched on every
 * view, which is the behaviour being removed.
 */
export async function getHeartRateTimeline(
  sessionId: string,
  startTime: string,
  endTime: string
): Promise<HeartRateRollupBucket[] | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // RLS scopes this read to the caller's own session.
  const { data: session } = await supabase
    .from("sessions")
    .select("hr_timeline, hr_timeline_fetched_at")
    .eq("id", sessionId)
    .maybeSingle()

  if (session?.hr_timeline_fetched_at) {
    return (session.hr_timeline as HeartRateRollupBucket[] | null) ?? []
  }

  const db = createServiceRoleClient()
  const { data: account } = await db
    .from("integration_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("source", "google_health")
    .eq("status", "active")
    .maybeSingle()
  if (!account) return null

  const tokens = await refreshAccessToken(decrypt(account.refresh_token!))
  const durationSeconds = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
  const windowSizeSeconds = Math.max(30, Math.round(durationSeconds / 80))

  const buckets = await fetchHeartRateRollup(
    tokens.accessToken,
    startTime,
    endTime,
    windowSizeSeconds
  )

  // Written even when empty - the stamp is the cache entry, and an empty
  // timeline is a real answer worth remembering.
  await supabase
    .from("sessions")
    .update({
      hr_timeline: buckets.length > 0 ? buckets : null,
      hr_timeline_fetched_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  return buckets
}

/**
 * Sets (or clears) a user-supplied RPE on any session, including synced ones.
 *
 * This writes manual_rpe rather than rpe precisely so it survives the next
 * sync: adapters own `rpe` and would overwrite it, but nothing in the sync path
 * touches manual_rpe. Most sessions arrive without any RPE at all - TUGG's gym
 * workouts carry no such field - and without one they contribute no measured
 * training load, so this is the main way to make the load metrics trustworthy.
 */
export async function setManualRpe(sessionId: string, rpe: number | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  if (rpe != null && (!Number.isInteger(rpe) || rpe < 1 || rpe > 20)) {
    throw new Error("RPE must be a whole number between 1 and 20.")
  }

  // RLS scopes this to the caller's own sessions.
  const { error } = await supabase
    .from("sessions")
    .update({ manual_rpe: rpe })
    .eq("id", sessionId)
  if (error) throw new Error(error.message)

  revalidatePath("/")
  revalidatePath(`/sessions/${sessionId}`)
}

// Deletes any manually-created session (practice/match/workout) - subtype
// rows (cardio_sessions/strength_sessions/handball_sessions and further
// down exercise_sets/matches/team_practices) clean up automatically via
// ON DELETE CASCADE, so this only needs to delete the sessions row itself.
// Synced (TUGG/Google Health) sessions can't be deleted this way - the
// next sync would just recreate them.
export async function deleteSession(sessionId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: existing, error: fetchErr } = await supabase
    .from("sessions")
    .select("external_source")
    .eq("id", sessionId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)
  if (existing.external_source !== null) {
    throw new Error("Synced sessions can't be deleted - they'd just be recreated by the next sync.")
  }

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId)
  if (error) throw new Error(error.message)

  redirect("/?logged=deleted")
}
