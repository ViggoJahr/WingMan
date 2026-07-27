import type { ZodError } from "zod"

/**
 * Shared shape for every server action driven by useActionState.
 *
 * `values` carries the submitted input back to the form. React 19 resets
 * uncontrolled fields once a form action settles, so without this a failed
 * submit would wipe everything the user typed - which was the old behaviour
 * when actions simply threw.
 */
export interface ActionState {
  /** "success" is for actions that stay on the page; ones that redirect never return. */
  status: "idle" | "error" | "success"
  message?: string
  fieldErrors?: Record<string, string[]>
  values?: Record<string, string>
}

export const idleState: ActionState = { status: "idle" }

export function formDataToValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value
  }
  return values
}

/**
 * Built from `error.issues` rather than Zod's flatten helpers so it doesn't
 * depend on which major version of Zod is installed.
 */
export function validationError(error: ZodError, formData: FormData): ActionState {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form"
    ;(fieldErrors[key] ??= []).push(issue.message)
  }

  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors,
    values: formDataToValues(formData),
  }
}

export function failure(message: string, formData?: FormData): ActionState {
  return {
    status: "error",
    message,
    values: formData ? formDataToValues(formData) : undefined,
  }
}
