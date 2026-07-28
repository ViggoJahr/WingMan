"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { matchSchema, type MatchInput } from "@/lib/validation/schemas"
import { failure, validationError, type ActionState } from "@/lib/validation/formState"

/**
 * The descriptive match columns, identical between insert and update.
 *
 * The 12 box-score counters are deliberately absent: they are derived by
 * counting match_events through the match_box_score view. Writing them here as
 * well would give two sources of truth that silently diverge the first time a
 * tagged event is added or removed.
 */
function matchStats(input: MatchInput) {
  return {
    opponent: input.opponent,
    is_home: input.is_home,
    play_time_min: input.play_time_min,
    importance: input.importance,
    opposition_difficulty: input.opposition_difficulty,
  }
}

/** A match with no recorded play time is stored as a zero-length session. */
function matchEndTime(input: MatchInput): string {
  const start = new Date(input.start_time).getTime()
  return new Date(start + (input.play_time_min ?? 0) * 60_000).toISOString()
}

export async function logMatch(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const parsed = matchSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)
  const input = parsed.data

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      type: "handball",
      start_time: new Date(input.start_time).toISOString(),
      end_time: matchEndTime(input),
      rpe: input.rpe,
      location: input.location,
    })
    .select("id")
    .single()
  if (sessionErr) return failure(sessionErr.message, formData)

  const { error: handballErr } = await supabase.from("handball_sessions").insert({
    session_id: session.id,
    subtype: "match",
    perceived_performance: input.perceived_performance,
    perceived_challenge: input.perceived_challenge,
    comments: input.comments,
  })
  if (handballErr) return failure(handballErr.message, formData)

  const { error: matchErr } = await supabase
    .from("matches")
    .insert({ session_id: session.id, ...matchStats(input) })
  if (matchErr) return failure(matchErr.message, formData)

  redirect("/?logged=match")
}

export async function updateMatch(
  sessionId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
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
  if (fetchErr) return failure(fetchErr.message, formData)
  if (existing.external_source !== null) {
    return failure(
      "Synced sessions can't be edited - they'd just be overwritten by the next sync.",
      formData
    )
  }

  const parsed = matchSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)
  const input = parsed.data

  const { error: sessionErr } = await supabase
    .from("sessions")
    .update({
      start_time: new Date(input.start_time).toISOString(),
      end_time: matchEndTime(input),
      rpe: input.rpe,
      location: input.location,
    })
    .eq("id", sessionId)
  if (sessionErr) return failure(sessionErr.message, formData)

  const { error: handballErr } = await supabase
    .from("handball_sessions")
    .update({
      perceived_performance: input.perceived_performance,
      perceived_challenge: input.perceived_challenge,
      comments: input.comments,
    })
    .eq("session_id", sessionId)
  if (handballErr) return failure(handballErr.message, formData)

  const { error: matchErr } = await supabase
    .from("matches")
    .update(matchStats(input))
    .eq("session_id", sessionId)
  if (matchErr) return failure(matchErr.message, formData)

  redirect(`/sessions/${sessionId}`)
}
