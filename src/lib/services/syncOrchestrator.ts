import { createServiceRoleClient } from "@/lib/supabase/server"
import { adapterRegistry } from "@/lib/integrations/registry"
import { mergeOverlappingSessions } from "./sessionMerge"

export async function runSync(accountId?: string) {
  const db = createServiceRoleClient()

  let query = db.from("integration_accounts").select("*").eq("status", "active")
  if (accountId) query = query.eq("id", accountId)
  const { data: accounts, error } = await query
  if (error) throw new Error(`Failed to load integration accounts: ${error.message}`)

  const results = []
  const touchedUserIds = new Set<string>()

  for (const account of accounts ?? []) {
    const adapter = adapterRegistry[account.source]
    if (!adapter) continue

    const { data: syncRun } = await db
      .from("sync_runs")
      .insert({ integration_account_id: account.id, status: "running" })
      .select("id")
      .single()

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
        .eq("id", syncRun!.id)
      await db
        .from("integration_accounts")
        .update({ last_synced_at: new Date().toISOString(), status: "active" })
        .eq("id", account.id)
      results.push({ accountId: account.id, source: account.source, itemsSynced, warnings })
      touchedUserIds.add(account.user_id)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await db
        .from("sync_runs")
        .update({ status: "error", error_message: message, finished_at: new Date().toISOString() })
        .eq("id", syncRun!.id)
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
      results.push({ userId, mergeError: message })
    }
  }

  return results
}
