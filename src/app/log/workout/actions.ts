"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function logWorkout(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const type = formData.get("type") as "cardio" | "strength_power" | "mobility_rehab" | "active_rest"
  const startTime = formData.get("start_time") as string
  const durationMinutes = Number(formData.get("duration_minutes"))
  const endTime = new Date(new Date(startTime).getTime() + durationMinutes * 60_000)
  const focus = (formData.get("focus") as string) || null
  const rpe = formData.get("rpe") ? Number(formData.get("rpe")) : null
  const location = (formData.get("location") as string) || null
  const distanceKm = formData.get("distance_km") ? Number(formData.get("distance_km")) : null

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      type,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime.toISOString(),
      rpe,
      location,
    })
    .select("id")
    .single()
  if (sessionErr) throw new Error(sessionErr.message)

  if (type === "cardio") {
    const { error } = await supabase.from("cardio_sessions").insert({
      session_id: session.id,
      focus,
      distance_m: distanceKm ? Math.round(distanceKm * 1000) : null,
    })
    if (error) throw new Error(error.message)
  } else if (type === "strength_power") {
    const { error } = await supabase.from("strength_sessions").insert({
      session_id: session.id,
      focus,
    })
    if (error) throw new Error(error.message)
  } else if (type === "active_rest") {
    const { error } = await supabase.from("active_rest").insert({
      session_id: session.id,
      focus,
    })
    if (error) throw new Error(error.message)
  }
  // mobility_rehab has no subtype table - the sessions row alone is enough.

  redirect("/?logged=workout")
}
