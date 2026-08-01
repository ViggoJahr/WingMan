"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { endTimeFrom, practiceSchema } from "@/lib/validation/schemas"
import { failure, validationError, type ActionState } from "@/lib/validation/formState"

export async function logPractice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const parsed = practiceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)
  const input = parsed.data

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      type: "handball",
      start_time: new Date(input.start_time).toISOString(),
      end_time: endTimeFrom(input.start_time, input.duration_minutes),
      rpe: input.rpe,
      location: input.location,
    })
    .select("id")
    .single()
  if (sessionErr) return failure(sessionErr.message, formData)

  const { error: handballErr } = await supabase.from("handball_sessions").insert({
    session_id: session.id,
    subtype: "team_practice",
    defense_vs_attack_ratio: input.defense_vs_attack_ratio,
    comments: input.comments,
    throws_count: input.throws_count,
    jump_load: input.jump_load,
    contact_load: input.contact_load,
    position: input.position,
    perceived_performance: input.perceived_performance,
  })
  if (handballErr) return failure(handballErr.message, formData)

  const { error: practiceErr } = await supabase.from("team_practices").insert({
    session_id: session.id,
    practice_focus: input.practice_focus,
    tactical_complexity: input.tactical_complexity,
  })
  if (practiceErr) return failure(practiceErr.message, formData)

  redirect("/?logged=practice")
}

/**
 * Adds practice detail to a session the sync already created.
 *
 * Google Health auto-creates handball sessions with subtype 'individual' - it
 * knows a handball-shaped activity happened but nothing about it. Without this,
 * the only way to record that it was a team practice was to log a *second*
 * session, leaving a duplicate the merge step cannot resolve (it only merges
 * across different external sources, and one of these has none).
 *
 * The sync owns start_time, end_time and rpe, so this deliberately does not
 * touch them: the watch's timing is better than a recollection, and the next
 * sync would overwrite an edit anyway. The user's own intensity goes to
 * manual_rpe, which the adapters never write - the same split the rest of the
 * app uses.
 */
export async function attachPractice(
  sessionId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const parsed = practiceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)
  const input = parsed.data

  const { data: existing, error: fetchErr } = await supabase
    .from("sessions")
    .select("id, type, handball_sessions(subtype)")
    .eq("id", sessionId)
    .maybeSingle()
  if (fetchErr) return failure(fetchErr.message, formData)
  if (!existing || existing.type !== "handball") {
    return failure("That session is not a handball session.", formData)
  }

  const detail = existing.handball_sessions as unknown as { subtype: string } | null
  if (detail && detail.subtype !== "individual") {
    return failure("That session already has practice or match detail.", formData)
  }

  const { error: rpeErr } = await supabase
    .from("sessions")
    .update({ manual_rpe: input.rpe, location: input.location })
    .eq("id", sessionId)
  if (rpeErr) return failure(rpeErr.message, formData)

  // Upsert rather than update: a detected session always has a
  // handball_sessions row, but a retry after a partial failure should not
  // depend on that.
  const { error: handballErr } = await supabase.from("handball_sessions").upsert(
    {
      session_id: sessionId,
      subtype: "team_practice",
      defense_vs_attack_ratio: input.defense_vs_attack_ratio,
      comments: input.comments,
      throws_count: input.throws_count,
      jump_load: input.jump_load,
      contact_load: input.contact_load,
      position: input.position,
      perceived_performance: input.perceived_performance,
    },
    { onConflict: "session_id" }
  )
  if (handballErr) return failure(handballErr.message, formData)

  const { error: practiceErr } = await supabase.from("team_practices").upsert(
    {
      session_id: sessionId,
      practice_focus: input.practice_focus,
      tactical_complexity: input.tactical_complexity,
    },
    { onConflict: "session_id" }
  )
  if (practiceErr) return failure(practiceErr.message, formData)

  redirect(`/sessions/${sessionId}`)
}

export async function updatePractice(
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

  const parsed = practiceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)
  const input = parsed.data

  const { error: sessionErr } = await supabase
    .from("sessions")
    .update({
      start_time: new Date(input.start_time).toISOString(),
      end_time: endTimeFrom(input.start_time, input.duration_minutes),
      rpe: input.rpe,
      location: input.location,
    })
    .eq("id", sessionId)
  if (sessionErr) return failure(sessionErr.message, formData)

  const { error: handballErr } = await supabase
    .from("handball_sessions")
    .update({
      defense_vs_attack_ratio: input.defense_vs_attack_ratio,
      comments: input.comments,
      throws_count: input.throws_count,
      jump_load: input.jump_load,
      contact_load: input.contact_load,
      position: input.position,
      perceived_performance: input.perceived_performance,
    })
    .eq("session_id", sessionId)
  if (handballErr) return failure(handballErr.message, formData)

  const { error: practiceErr } = await supabase
    .from("team_practices")
    .update({
      practice_focus: input.practice_focus,
      tactical_complexity: input.tactical_complexity,
    })
    .eq("session_id", sessionId)
  if (practiceErr) return failure(practiceErr.message, formData)

  redirect(`/sessions/${sessionId}`)
}
