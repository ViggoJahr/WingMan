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
