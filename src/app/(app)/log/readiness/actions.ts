"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { computeReadinessScore, smoothReadinessScore } from "@/lib/services/readinessScore"
import { readinessSchema } from "@/lib/validation/schemas"
import { failure, validationError, type ActionState } from "@/lib/validation/formState"

export async function logReadiness(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const parsed = readinessSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)
  const input = parsed.data

  const { data: previous } = await supabase
    .from("readiness")
    .select("total_score")
    .eq("user_id", user.id)
    .lt("date", input.date)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle()

  const rawScore = computeReadinessScore({
    trainingLoad: input.training_load,
    muscleSoreness: input.muscle_soreness,
    mentalStress: input.mental_stress,
    currentInjury: input.current_injury,
    currentIllness: input.current_illness,
    sleepQuality: input.sleep_quality,
    foodBeverage: input.food_beverage,
    mood: input.mood,
    recoveryEnergy: input.recovery_energy,
  })
  const totalScore = smoothReadinessScore(rawScore, previous?.total_score ?? null)

  const { error } = await supabase.from("readiness").upsert(
    {
      user_id: user.id,
      date: input.date,
      training_load: input.training_load,
      muscle_soreness: input.muscle_soreness,
      mental_stress: input.mental_stress,
      current_injury: input.current_injury,
      current_illness: input.current_illness,
      sleep_quality: input.sleep_quality,
      food_beverage: input.food_beverage,
      mood: input.mood,
      recovery_energy: input.recovery_energy,
      total_score: totalScore,
      notes: input.notes,
    },
    { onConflict: "user_id,date" }
  )
  if (error) return failure(error.message, formData)

  redirect("/?logged=readiness")
}

export async function deleteReadiness(date: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { error } = await supabase.from("readiness").delete().eq("user_id", user.id).eq("date", date)
  if (error) throw new Error(error.message)

  redirect("/readiness")
}
