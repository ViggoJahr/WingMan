"use server"

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
