"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function logPractice(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const startTime = formData.get("start_time") as string
  const durationMinutes = Number(formData.get("duration_minutes"))
  const endTime = new Date(new Date(startTime).getTime() + durationMinutes * 60_000)

  const rpe = formData.get("rpe") ? Number(formData.get("rpe")) : null
  const location = (formData.get("location") as string) || null
  const practiceFocus = (formData.get("practice_focus") as string) || null
  const defenseVsAttackRatio = (formData.get("defense_vs_attack_ratio") as string) || null
  const tacticalComplexity = formData.get("tactical_complexity")
    ? Number(formData.get("tactical_complexity"))
    : null
  const comments = (formData.get("comments") as string) || null

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      type: "handball",
      start_time: new Date(startTime).toISOString(),
      end_time: endTime.toISOString(),
      rpe,
      location,
    })
    .select("id")
    .single()
  if (sessionErr) throw new Error(sessionErr.message)

  const { error: handballErr } = await supabase.from("handball_sessions").insert({
    session_id: session.id,
    subtype: "team_practice",
    defense_vs_attack_ratio: defenseVsAttackRatio,
    comments,
  })
  if (handballErr) throw new Error(handballErr.message)

  const { error: practiceErr } = await supabase.from("team_practices").insert({
    session_id: session.id,
    practice_focus: practiceFocus,
    tactical_complexity: tacticalComplexity,
  })
  if (practiceErr) throw new Error(practiceErr.message)

  redirect("/?logged=practice")
}

export async function updatePractice(sessionId: string, formData: FormData) {
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
  if (fetchErr) throw new Error(fetchErr.message)
  if (existing.external_source !== null) {
    throw new Error("Synced sessions can't be edited - they'd just be overwritten by the next sync.")
  }

  const startTime = formData.get("start_time") as string
  const durationMinutes = Number(formData.get("duration_minutes"))
  const endTime = new Date(new Date(startTime).getTime() + durationMinutes * 60_000)

  const rpe = formData.get("rpe") ? Number(formData.get("rpe")) : null
  const location = (formData.get("location") as string) || null
  const practiceFocus = (formData.get("practice_focus") as string) || null
  const defenseVsAttackRatio = (formData.get("defense_vs_attack_ratio") as string) || null
  const tacticalComplexity = formData.get("tactical_complexity")
    ? Number(formData.get("tactical_complexity"))
    : null
  const comments = (formData.get("comments") as string) || null

  const { error: sessionErr } = await supabase
    .from("sessions")
    .update({
      start_time: new Date(startTime).toISOString(),
      end_time: endTime.toISOString(),
      rpe,
      location,
    })
    .eq("id", sessionId)
  if (sessionErr) throw new Error(sessionErr.message)

  const { error: handballErr } = await supabase
    .from("handball_sessions")
    .update({ defense_vs_attack_ratio: defenseVsAttackRatio, comments })
    .eq("session_id", sessionId)
  if (handballErr) throw new Error(handballErr.message)

  const { error: practiceErr } = await supabase
    .from("team_practices")
    .update({ practice_focus: practiceFocus, tactical_complexity: tacticalComplexity })
    .eq("session_id", sessionId)
  if (practiceErr) throw new Error(practiceErr.message)

  redirect(`/sessions/${sessionId}`)
}
