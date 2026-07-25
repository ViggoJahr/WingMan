import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Tables } from "@/lib/supabase/types"

export type IntegrationAccountRow = Tables<"integration_accounts">

export interface SyncResult {
  itemsSynced: number
  warnings?: string[]
}

export interface SourceAdapter {
  source: "tugg" | "google_health"
  sync(account: IntegrationAccountRow, db: SupabaseClient<Database>): Promise<SyncResult>
}
