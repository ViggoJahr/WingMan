"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { failure, validationError, type ActionState } from "@/lib/validation/formState"

const emptyToNull = (value: unknown) => (value === "" || value == null ? null : value)

// Height and birth date drive more than display: age gives max-HR estimation
// and gender feeds the TRIMP coefficient, both needed for the heart-rate work.
const profileSchema = z.object({
  height_cm: z.preprocess(
    emptyToNull,
    z.coerce
      .number()
      .min(50, "Height must be at least 50 cm")
      .max(260, "Height must be under 260 cm")
      .nullable()
  ),
  birth_date: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Not a valid date")
      .nullable()
  ),
  gender: z.preprocess(emptyToNull, z.string().trim().max(50).nullable()),
})

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const parsed = profileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return validationError(parsed.error, formData)

  // RLS restricts this to the caller's own row.
  const { error } = await supabase.from("users").update(parsed.data).eq("id", user.id)
  if (error) return failure(error.message, formData)

  revalidatePath("/settings")
  return { status: "success", message: "Profile saved." }
}
