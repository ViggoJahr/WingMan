"use server"

import { redirect } from "next/navigation"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { decrypt } from "@/lib/crypto"
import { refreshAccessToken } from "@/lib/integrations/google_health/auth"
import { fetchHeartRateRollup, type HeartRateRollupBucket } from "@/lib/integrations/google_health/client"

export async function getHeartRateTimeline(
  startTime: string,
  endTime: string
): Promise<HeartRateRollupBucket[] | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

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

  return fetchHeartRateRollup(tokens.accessToken, startTime, endTime, windowSizeSeconds)
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
