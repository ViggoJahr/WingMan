"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { injurySchema } from "@/lib/validation/schemas"
import { failure, validationError, type ActionState } from "@/lib/validation/formState"
import { todayIso } from "@/lib/dates"

export async function logInjury(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const parsed = injurySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)
  const input = parsed.data

  const { error } = await supabase.from("injuries").insert({
    user_id: user.id,
    type: input.type,
    grade: input.grade,
    injured_date: input.injured_date,
    cleared_date: input.cleared_date,
    description: input.description,
  })
  if (error) return failure(error.message, formData)

  redirect("/injuries?logged=1")
}

export async function updateInjury(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const parsed = injurySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)
  const input = parsed.data

  // RLS already scopes this to the owner; the explicit user_id is belt and
  // braces against a policy change silently widening the update.
  const { error } = await supabase
    .from("injuries")
    .update({
      type: input.type,
      grade: input.grade,
      injured_date: input.injured_date,
      cleared_date: input.cleared_date,
      description: input.description,
    })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) return failure(error.message, formData)

  redirect("/injuries")
}

/** Closes an open injury as of today. The one action worth a single tap. */
export async function clearInjury(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { error } = await supabase
    .from("injuries")
    .update({ cleared_date: todayIso() })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)

  revalidatePath("/injuries")
  revalidatePath("/")
}

export async function deleteInjury(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { error } = await supabase.from("injuries").delete().eq("id", id).eq("user_id", user.id)
  if (error) throw new Error(error.message)

  redirect("/injuries")
}
