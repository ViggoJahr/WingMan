import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

// /handball previously ran three raw queries in the page component and joined
// them in JS through a Map. match_box_score already carries the session columns,
// so the match side collapses to a single ordered select.

export type MatchBoxScore = Database["public"]["Views"]["match_box_score"]["Row"]

export interface PracticeSummary {
  session_id: string
  start_time: string
  rpe: number | null
  practice_focus: string | null
  tactical_complexity: number | null
  throws_count: number | null
  position: string | null
}

/** Newest first. Excludes sessions merged away into another. */
export async function fetchMatches(
  db: SupabaseClient<Database>,
  limit = 50
): Promise<MatchBoxScore[]> {
  const { data, error } = await db
    .from("match_box_score")
    .select("*")
    .is("merged_into", null)
    .order("start_time", { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to load matches: ${error.message}`)
  return data ?? []
}

/**
 * Practices still need a join: team_practices holds the focus, handball_sessions
 * the tissue load, sessions the time. Two queries beat a view here because
 * nothing else reads this shape.
 */
export async function fetchPractices(
  db: SupabaseClient<Database>,
  limit = 50
): Promise<PracticeSummary[]> {
  const { data: sessions, error: sessionErr } = await db
    .from("sessions")
    .select("id, start_time, rpe")
    .eq("type", "handball")
    .is("merged_into", null)
    .order("start_time", { ascending: false })
    .limit(limit)

  if (sessionErr) throw new Error(`Failed to load practices: ${sessionErr.message}`)
  const ids = (sessions ?? []).map((row) => row.id)
  if (ids.length === 0) return []

  const [{ data: practices }, { data: handball }] = await Promise.all([
    db.from("team_practices").select("session_id, practice_focus, tactical_complexity").in("session_id", ids),
    db.from("handball_sessions").select("session_id, throws_count, position").in("session_id", ids),
  ])

  const practiceById = new Map((practices ?? []).map((row) => [row.session_id, row]))
  const handballById = new Map((handball ?? []).map((row) => [row.session_id, row]))

  // Driven by the session list, so ordering comes from the database rather than
  // a client-side sort over an unbounded fetch.
  return (sessions ?? [])
    .filter((session) => practiceById.has(session.id))
    .map((session) => {
      const practice = practiceById.get(session.id)!
      const extra = handballById.get(session.id)
      return {
        session_id: session.id,
        start_time: session.start_time,
        rpe: session.rpe,
        practice_focus: practice.practice_focus,
        tactical_complexity: practice.tactical_complexity,
        throws_count: extra?.throws_count ?? null,
        position: extra?.position ?? null,
      }
    })
}

/** Rolling throwing volume - the shoulder-load number throws_count exists for. */
export function throwLoad(practices: PracticeSummary[], days: number, now = new Date()): number {
  const cutoff = now.getTime() - days * 86_400_000
  return practices
    .filter((p) => new Date(p.start_time).getTime() >= cutoff)
    .reduce((total, p) => total + (p.throws_count ?? 0), 0)
}
