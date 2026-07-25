"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { computeReadinessScore, smoothReadinessScore } from "@/lib/services/readinessScore"

function num(formData: FormData, key: string) {
  return Number(formData.get(key) ?? 0)
}

export async function logReadiness(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const date = formData.get("date") as string
  const notes = (formData.get("notes") as string) || null

  const inputs = {
    trainingLoad: num(formData, "training_load"),
    muscleSoreness: num(formData, "muscle_soreness"),
    mentalStress: num(formData, "mental_stress"),
    currentInjury: num(formData, "current_injury"),
    currentIllness: num(formData, "current_illness"),
    sleepQuality: num(formData, "sleep_quality"),
    foodBeverage: num(formData, "food_beverage"),
    mood: num(formData, "mood"),
    recoveryEnergy: num(formData, "recovery_energy"),
  }

  const { data: previous } = await supabase
    .from("readiness")
    .select("total_score")
    .eq("user_id", user.id)
    .lt("date", date)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle()

  const rawScore = computeReadinessScore(inputs)
  const totalScore = smoothReadinessScore(rawScore, previous?.total_score ?? null)

  const { error } = await supabase.from("readiness").upsert(
    {
      user_id: user.id,
      date,
      training_load: inputs.trainingLoad,
      muscle_soreness: inputs.muscleSoreness,
      mental_stress: inputs.mentalStress,
      current_injury: inputs.currentInjury,
      current_illness: inputs.currentIllness,
      sleep_quality: inputs.sleepQuality,
      food_beverage: inputs.foodBeverage,
      mood: inputs.mood,
      recovery_energy: inputs.recoveryEnergy,
      total_score: totalScore,
      notes,
    },
    { onConflict: "user_id,date" }
  )
  if (error) throw new Error(error.message)

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
