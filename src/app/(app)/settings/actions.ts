"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { encrypt } from "@/lib/crypto"
import { signInToTugg } from "@/lib/integrations/tugg/client"
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

const tuggCredentialsSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Not a valid email address"),
  password: z.string().min(1, "Password is required"),
})

/**
 * Connects (or reconnects) TUGG by exchanging email + password for a session.
 *
 * TUGG is a Supabase project whose refresh tokens rotate on every use, and the
 * session is shared with the athlete's own use of the TUGG app - so the stored
 * token can be invalidated from outside this app entirely ("Invalid Refresh
 * Token: Already Used"), with no way to recover. signInToTugg has existed since
 * the adapter was written but was never reachable from any UI, which meant a
 * dead token locked the integration out permanently.
 *
 * The password is used for this single exchange and never stored or logged -
 * only the returned tokens are persisted, encrypted at rest. Note that
 * `values` is deliberately NOT echoed back on failure here, unlike the other
 * forms, so a rejected password never survives in the returned state.
 */
export async function connectTugg(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const parsed = tuggCredentialsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "_form"
      ;(fieldErrors[key] ??= []).push(issue.message)
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors }
  }

  let session
  try {
    session = await signInToTugg(parsed.data.email, parsed.data.password)
  } catch (err) {
    console.error("[tugg] sign-in failed:", err)
    return failure("TUGG rejected those credentials. Check the email and password and try again.")
  }

  const { error } = await supabase.from("integration_accounts").upsert(
    {
      user_id: user.id,
      source: "tugg",
      auth_type: "password_grant",
      access_token: encrypt(session.access_token),
      refresh_token: encrypt(session.refresh_token),
      expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      status: "active",
    },
    { onConflict: "user_id,source" }
  )
  if (error) return failure(error.message)

  revalidatePath("/settings")
  revalidatePath("/sync")
  return { status: "success", message: "TUGG connected. Run a sync to pull your data." }
}
