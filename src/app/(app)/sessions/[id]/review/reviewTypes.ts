import type { Database } from "@/lib/supabase/types"

export type MatchEventRow = Database["public"]["Tables"]["match_events"]["Row"]
export type MatchVideoRow = Database["public"]["Tables"]["match_videos"]["Row"]

/** Where a locally-held event is in its journey to the server. */
export type SyncState = "pending" | "saved" | "failed"

export interface LocalEvent extends MatchEventRow {
  sync: SyncState
}
