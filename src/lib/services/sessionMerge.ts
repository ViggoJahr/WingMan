import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, TablesUpdate } from "@/lib/supabase/types"

interface CandidateSession {
  id: string
  external_source: string | null
  start_time: string
  end_time: string | null
  rpe: number | null
  calories_kcal: number | null
  active_duration_seconds: number | null
  active_zone_minutes: number | null
  hr_zones: unknown
}

function richnessScore(s: CandidateSession, hasSets: boolean, hasHandballDetail: boolean): number {
  // Exercise-set detail and manually-logged match/practice stats (goals,
  // assists, practice focus, notes) are irreplaceable, hand-entered data -
  // they always outrank an auto-detected summary from a fitness tracker,
  // which is exactly the case an unclassified Google Health "HANDBALL"
  // blip needs to lose against a real manually-logged match.
  if (hasSets || hasHandballDetail) return 1000
  let score = 0
  if (s.rpe != null) score++
  if (s.calories_kcal != null) score++
  if (s.active_duration_seconds != null) score++
  if (s.active_zone_minutes != null) score++
  if (s.hr_zones != null) score++
  return score
}

// Detects sessions from different sources describing the same real workout
// (confirmed happening live: TUGG and Google Health both logging the same
// gym session/run) and merges them - the richer session survives as
// primary, backfilled with any enrichment fields it's missing from the
// other, and the other is marked merged_into rather than deleted so its
// original source data stays available.
export async function mergeOverlappingSessions(userId: string, db: SupabaseClient<Database>) {
  const { data: sessions, error } = await db
    .from("sessions")
    .select(
      "id, external_source, start_time, end_time, rpe, calories_kcal, active_duration_seconds, active_zone_minutes, hr_zones"
    )
    .eq("user_id", userId)
    .is("merged_into", null)
    .not("end_time", "is", null)
    .order("start_time", { ascending: true })

  if (error) throw new Error(`Failed to load sessions for merge: ${error.message}`)
  if (!sessions || sessions.length < 2) return { merged: 0 }

  const { data: setsRows } = await db
    .from("exercise_sets")
    .select("session_id")
    .in(
      "session_id",
      sessions.map((s) => s.id)
    )
  const sessionsWithSets = new Set((setsRows ?? []).map((r) => r.session_id))

  const { data: cardioRows } = await db
    .from("cardio_sessions")
    .select("session_id, focus, distance_m, avg_hr")
    .in(
      "session_id",
      sessions.map((s) => s.id)
    )
  const cardioBySession = new Map((cardioRows ?? []).map((r) => [r.session_id, r]))

  // A session has "real" handball detail only once it's linked to an
  // actual matches or team_practices row, not merely handball_sessions
  // itself (the auto-detected, unclassified HANDBALL case creates a bare
  // handball_sessions row with no match/practice row yet).
  const { data: matchRows } = await db
    .from("matches")
    .select("session_id")
    .in(
      "session_id",
      sessions.map((s) => s.id)
    )
  const { data: practiceRows } = await db
    .from("team_practices")
    .select("session_id")
    .in(
      "session_id",
      sessions.map((s) => s.id)
    )
  const sessionsWithHandballDetail = new Set([
    ...(matchRows ?? []).map((r) => r.session_id),
    ...(practiceRows ?? []).map((r) => r.session_id),
  ])

  let merged = 0
  const consumed = new Set<string>()

  for (let i = 0; i < sessions.length; i++) {
    const a = sessions[i]
    if (consumed.has(a.id)) continue

    for (let j = i + 1; j < sessions.length; j++) {
      const b = sessions[j]
      if (consumed.has(b.id)) continue
      if (a.external_source === b.external_source) continue
      if (!a.end_time || !b.end_time) continue

      const overlaps = a.start_time < b.end_time && b.start_time < a.end_time
      if (!overlaps) continue

      const aScore = richnessScore(a, sessionsWithSets.has(a.id), sessionsWithHandballDetail.has(a.id))
      const bScore = richnessScore(b, sessionsWithSets.has(b.id), sessionsWithHandballDetail.has(b.id))
      const [primary, secondary] = aScore >= bScore ? [a, b] : [b, a]

      const backfill: TablesUpdate<"sessions"> = {}
      if (primary.rpe == null && secondary.rpe != null) backfill.rpe = secondary.rpe
      if (primary.calories_kcal == null && secondary.calories_kcal != null)
        backfill.calories_kcal = secondary.calories_kcal
      if (primary.active_duration_seconds == null && secondary.active_duration_seconds != null)
        backfill.active_duration_seconds = secondary.active_duration_seconds
      if (primary.active_zone_minutes == null && secondary.active_zone_minutes != null)
        backfill.active_zone_minutes = secondary.active_zone_minutes
      if (primary.hr_zones == null && secondary.hr_zones != null) backfill.hr_zones = secondary.hr_zones

      if (Object.keys(backfill).length > 0) {
        await db.from("sessions").update(backfill).eq("id", primary.id)
      }

      const primaryCardio = cardioBySession.get(primary.id)
      const secondaryCardio = cardioBySession.get(secondary.id)
      if (primaryCardio && secondaryCardio) {
        const cardioBackfill: TablesUpdate<"cardio_sessions"> = {}
        if (primaryCardio.avg_hr == null && secondaryCardio.avg_hr != null)
          cardioBackfill.avg_hr = secondaryCardio.avg_hr
        if (primaryCardio.distance_m == null && secondaryCardio.distance_m != null)
          cardioBackfill.distance_m = secondaryCardio.distance_m
        if (Object.keys(cardioBackfill).length > 0) {
          await db.from("cardio_sessions").update(cardioBackfill).eq("session_id", primary.id)
        }
      }

      await db.from("sessions").update({ merged_into: primary.id }).eq("id", secondary.id)
      consumed.add(secondary.id)
      merged++
      if (primary.id === b.id) break // a was consumed as secondary, move to next i
    }
  }

  return { merged }
}
