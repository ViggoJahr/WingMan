"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ActionState } from "@/lib/validation/formState"

/** Banner for whole-form failures and the "fix the highlighted fields" summary. */
export function FormAlert({ state }: { state: ActionState }) {
  if (state.status !== "error" || !state.message) return null

  return (
    <p
      role="alert"
      className="rounded-md border border-status-critical/50 bg-status-critical/10 p-3 text-sm text-status-critical"
    >
      {state.message}
    </p>
  )
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return <p className="text-xs text-status-critical">{errors.join(". ")}</p>
}

/**
 * Label + control + inline error, matching the flex-col gap-2 pattern the
 * forms already used before validation existed.
 */
export function Field({
  name,
  label,
  state,
  children,
  className,
  hint,
}: {
  name: string
  label: string
  state: ActionState
  children: React.ReactNode
  className?: string
  hint?: string
}) {
  const errors = state.fieldErrors?.[name]

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && !errors && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError errors={errors} />
    </div>
  )
}

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  className,
}: {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  )
}

/**
 * Resolves what a field should display: what the user last submitted (so a
 * failed save doesn't discard typing), else the stored value, else blank.
 */
export function fieldValue(
  state: ActionState,
  name: string,
  fallback: string | number | null | undefined
): string {
  const submitted = state.values?.[name]
  if (submitted != null) return submitted
  return fallback == null ? "" : String(fallback)
}
