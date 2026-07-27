import { createServiceRoleClient } from "@/lib/supabase/server"
import { adapterRegistry } from "@/lib/integrations/registry"
import { mergeOverlappingSessions } from "./sessionMerge"

export async function runSync(accountId?: string) {
  const db = createServiceRoleClient()

  // Everything except explicitly disabled accounts. Previously this selected
  // only status = 'active', while a failure set status = 'error' - so a single
  // transient failure (an expired token, a bad env var on the deploy) excluded
  // that integration from every future run, permanently, with nothing to flip
  // it back. Both accounts sat dead for a day that way. 'error' is now purely
  // informational for the UI; only 'disabled' actually stops syncing.
  let query = db.from("integration_accounts").select("*").neq("status", "disabled")
  if (accountId) query = query.eq("id", accountId)
  const { data: accounts, error } = await query
  if (error) throw new Error(`Failed to load integration accounts: ${error.message}`)

  const results = []
  const touchedUserIds = new Set<string>()

  for (const account of accounts ?? []) {
    const adapter = adapterRegistry[account.source]
    if (!adapter) continue

    // The run row is the only durable record of a failure, so a failed insert
    // has to abort this account rather than proceed - previously the following
    // `syncRun!.id` threw a TypeError that aborted every remaining account too.
    const { data: syncRun, error: runErr } = await db
      .from("sync_runs")
      .insert({ integration_account_id: account.id, status: "running" })
      .select("id")
      .single()

    if (runErr || !syncRun) {
      const message = runErr?.message ?? "Failed to create sync run"
      console.error(`[sync] ${account.source}: ${message}`)
      results.push({ accountId: account.id, source: account.source, error: message })
      continue
    }

    try {
      const { itemsSynced, warnings } = await adapter.sync(account, db)
      await db
        .from("sync_runs")
        .update({
          status: warnings?.length ? "partial" : "success",
          items_synced: itemsSynced,
          error_message: warnings?.length ? warnings.join("\n") : null,
          finished_at: new Date().toISOString(),
        })
        .eq("id", syncRun.id)
      await db
        .from("integration_accounts")
        .update({ last_synced_at: new Date().toISOString(), status: "active" })
        .eq("id", account.id)
      results.push({ accountId: account.id, source: account.source, itemsSynced, warnings })
      touchedUserIds.add(account.user_id)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[sync] ${account.source} failed:`, err)
      await db
        .from("sync_runs")
        .update({ status: "error", error_message: message, finished_at: new Date().toISOString() })
        .eq("id", syncRun.id)
      await db.from("integration_accounts").update({ status: "error" }).eq("id", account.id)
      results.push({ accountId: account.id, source: account.source, error: message })
    }
  }

  // Runs once per user after all their sources have synced, so a session
  // that just landed from one source can be matched against another
  // source's session from the same run.
  for (const userId of touchedUserIds) {
    try {
      const { merged } = await mergeOverlappingSessions(userId, db)
      if (merged > 0) results.push({ userId, merged })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[sync] merge failed for user ${userId}:`, err)
      results.push({ userId, mergeError: message })
    }
  }

  return results
}
