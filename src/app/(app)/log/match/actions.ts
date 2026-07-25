"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

function numOrNull(formData: FormData, key: string) {
  const v = formData.get(key)
  return v ? Number(v) : null
}

function numOrZero(formData: FormData, key: string) {
  const v = formData.get(key)
  return v ? Number(v) : 0
}

export async function logMatch(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const startTime = formData.get("start_time") as string
  const playTimeMin = numOrNull(formData, "play_time_min")
  const endTime = playTimeMin
    ? new Date(new Date(startTime).getTime() + playTimeMin * 60_000)
    : new Date(startTime)

  const rpe = numOrNull(formData, "rpe")
  const location = (formData.get("location") as string) || null
  const opponent = (formData.get("opponent") as string) || null
  const isHome = formData.get("is_home") === "on"
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
    subtype: "match",
    perceived_performance: numOrNull(formData, "perceived_performance"),
    perceived_challenge: numOrNull(formData, "perceived_challenge"),
    comments,
  })
  if (handballErr) throw new Error(handballErr.message)

  const { error: matchErr } = await supabase.from("matches").insert({
    session_id: session.id,
    opponent,
    is_home: isHome,
    play_time_min: playTimeMin,
    importance: numOrNull(formData, "importance"),
    opposition_difficulty: numOrNull(formData, "opposition_difficulty"),
    goals: numOrZero(formData, "goals"),
    assists: numOrZero(formData, "assists"),
    technical_faults: numOrZero(formData, "technical_faults"),
    steals: numOrZero(formData, "steals"),
    shots_missed: numOrZero(formData, "shots_missed"),
    shots_saved: numOrZero(formData, "shots_saved"),
    nine_m_shots: numOrZero(formData, "nine_m_shots"),
    breakthroughs: numOrZero(formData, "breakthroughs"),
    suspensions_created: numOrZero(formData, "suspensions_created"),
    suspensions_received: numOrZero(formData, "suspensions_received"),
    blocks: numOrZero(formData, "blocks"),
    big_mistakes: numOrZero(formData, "big_mistakes"),
  })
  if (matchErr) throw new Error(matchErr.message)

  redirect("/?logged=match")
}

export async function updateMatch(sessionId: string, formData: FormData) {
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
  const playTimeMin = numOrNull(formData, "play_time_min")
  const endTime = playTimeMin
    ? new Date(new Date(startTime).getTime() + playTimeMin * 60_000)
    : new Date(startTime)

  const rpe = numOrNull(formData, "rpe")
  const location = (formData.get("location") as string) || null
  const opponent = (formData.get("opponent") as string) || null
  const isHome = formData.get("is_home") === "on"
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
    .update({
      perceived_performance: numOrNull(formData, "perceived_performance"),
      perceived_challenge: numOrNull(formData, "perceived_challenge"),
      comments,
    })
    .eq("session_id", sessionId)
  if (handballErr) throw new Error(handballErr.message)

  const { error: matchErr } = await supabase
    .from("matches")
    .update({
      opponent,
      is_home: isHome,
      play_time_min: playTimeMin,
      importance: numOrNull(formData, "importance"),
      opposition_difficulty: numOrNull(formData, "opposition_difficulty"),
      goals: numOrZero(formData, "goals"),
      assists: numOrZero(formData, "assists"),
      technical_faults: numOrZero(formData, "technical_faults"),
      steals: numOrZero(formData, "steals"),
      shots_missed: numOrZero(formData, "shots_missed"),
      shots_saved: numOrZero(formData, "shots_saved"),
      nine_m_shots: numOrZero(formData, "nine_m_shots"),
      breakthroughs: numOrZero(formData, "breakthroughs"),
      suspensions_created: numOrZero(formData, "suspensions_created"),
      suspensions_received: numOrZero(formData, "suspensions_received"),
      blocks: numOrZero(formData, "blocks"),
      big_mistakes: numOrZero(formData, "big_mistakes"),
    })
    .eq("session_id", sessionId)
  if (matchErr) throw new Error(matchErr.message)

  redirect(`/sessions/${sessionId}`)
}
