"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  endTimeFrom,
  workoutSchema,
  workoutUpdateSchema,
  type WorkoutType,
} from "@/lib/validation/schemas"
import { failure, validationError, type ActionState } from "@/lib/validation/formState"

type SubtypeInput = { focus: string | null; distance_km: number | null }

/**
 * Writes the type-specific companion row. mobility_rehab has no subtype table -
 * the sessions row alone carries everything it needs.
 */
async function writeSubtype(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  type: WorkoutType,
  input: SubtypeInput,
  mode: "insert" | "update"
): Promise<string | null> {
  const distanceM = input.distance_km != null ? Math.round(input.distance_km * 1000) : null

  if (type === "cardio") {
    const payload = { focus: input.focus, distance_m: distanceM }
    const { error } =
      mode === "insert"
        ? await supabase.from("cardio_sessions").insert({ session_id: sessionId, ...payload })
        : await supabase.from("cardio_sessions").update(payload).eq("session_id", sessionId)
    return error?.message ?? null
  }

  if (type === "strength_power") {
    const { error } =
      mode === "insert"
        ? await supabase.from("strength_sessions").insert({ session_id: sessionId, focus: input.focus })
        : await supabase.from("strength_sessions").update({ focus: input.focus }).eq("session_id", sessionId)
    return error?.message ?? null
  }

  if (type === "active_rest") {
    const { error } =
      mode === "insert"
        ? await supabase.from("active_rest").insert({ session_id: sessionId, focus: input.focus })
        : await supabase.from("active_rest").update({ focus: input.focus }).eq("session_id", sessionId)
    return error?.message ?? null
  }

  return null
}

export async function logWorkout(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const parsed = workoutSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)
  const input = parsed.data

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      type: input.type,
      start_time: new Date(input.start_time).toISOString(),
      end_time: endTimeFrom(input.start_time, input.duration_minutes),
      rpe: input.rpe,
      location: input.location,
    })
    .select("id")
    .single()
  if (sessionErr) return failure(sessionErr.message, formData)

  const subtypeErr = await writeSubtype(supabase, session.id, input.type, input, "insert")
  if (subtypeErr) return failure(subtypeErr, formData)

  redirect("/?logged=workout")
}

export async function updateWorkout(
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
    .select("external_source, type")
    .eq("id", sessionId)
    .single()
  if (fetchErr) return failure(fetchErr.message, formData)
  if (existing.external_source !== null) {
    return failure(
      "Synced sessions can't be edited - they'd just be overwritten by the next sync.",
      formData
    )
  }

  // Type is fixed after creation: changing it would mean migrating the row
  // between subtype tables, so the form renders it read-only and it is read
  // from the database rather than the submitted data.
  const parsed = workoutUpdateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)
  const input = parsed.data
  const type = existing.type as WorkoutType

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

  const subtypeErr = await writeSubtype(supabase, sessionId, type, input, "update")
  if (subtypeErr) return failure(subtypeErr, formData)

  redirect(`/sessions/${sessionId}`)
}
