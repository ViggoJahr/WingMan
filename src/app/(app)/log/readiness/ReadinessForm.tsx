"use client"

import { useActionState, useState } from "react"
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { FormAlert, SubmitButton } from "@/components/forms/FormParts"
import { idleState } from "@/lib/validation/formState"
import { cn } from "@/lib/utils"
import {
  READINESS_DIMENSIONS,
  describeValue,
  severityFor,
  type ReadinessField,
  type Severity,
} from "@/lib/services/readinessDimensions"
import { deleteReadiness, logReadiness } from "./actions"

const DEFAULTS: Record<ReadinessField, number> = {
  training_load: 0,
  muscle_soreness: 0,
  mental_stress: 0,
  current_injury: 0,
  current_illness: 0,
  sleep_quality: 5,
  food_beverage: 5,
  mood: 5,
  recovery_energy: 5,
}

const SEVERITY_TEXT: Record<Severity, string> = {
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
}

const SEVERITY_BG: Record<Severity, string> = {
  good: "bg-status-good",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
}

const SEVERITY_BORDER: Record<Severity, string> = {
  good: "border-status-good",
  warning: "border-status-warning",
  critical: "border-status-critical",
}

export interface ExistingReadiness {
  training_load: number | null
  muscle_soreness: number | null
  mental_stress: number | null
  current_injury: number | null
  current_illness: number | null
  sleep_quality: number | null
  food_beverage: number | null
  mood: number | null
  recovery_energy: number | null
  notes: string | null
}

export function ReadinessForm({
  date,
  previousScore,
  existingValues,
}: {
  date: string
  previousScore: number | null
  existingValues?: ExistingReadiness | null
}) {
  const [values, setValues] = useState<Record<ReadinessField, number>>({
    ...DEFAULTS,
    ...(existingValues
      ? {
          training_load: existingValues.training_load ?? DEFAULTS.training_load,
          muscle_soreness: existingValues.muscle_soreness ?? DEFAULTS.muscle_soreness,
          mental_stress: existingValues.mental_stress ?? DEFAULTS.mental_stress,
          current_injury: existingValues.current_injury ?? DEFAULTS.current_injury,
          current_illness: existingValues.current_illness ?? DEFAULTS.current_illness,
          sleep_quality: existingValues.sleep_quality ?? DEFAULTS.sleep_quality,
          food_beverage: existingValues.food_beverage ?? DEFAULTS.food_beverage,
          mood: existingValues.mood ?? DEFAULTS.mood,
          recovery_energy: existingValues.recovery_energy ?? DEFAULTS.recovery_energy,
        }
      : {}),
  })

  const [state, formAction] = useActionState(logReadiness, idleState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={date} required />
      </div>

      {previousScore != null && (
        <p className="text-xs text-muted-foreground">
          Previous score: {previousScore}/100 - blended with today&apos;s so one day doesn&apos;t swing it too
          much.
        </p>
      )}

      {READINESS_DIMENSIONS.map((dim) => {
        const value = values[dim.field]
        const severity = severityFor(dim, value)
        return (
          <div key={dim.field} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{dim.label}</Label>
              <span className={cn("text-sm font-semibold", SEVERITY_TEXT[severity])}>{value}/10</span>
            </div>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[value]}
              indicatorClassName={SEVERITY_BG[severity]}
              thumbClassName={SEVERITY_BORDER[severity]}
              onValueChange={(v) => {
                const next = Array.isArray(v) ? v[0] : v
                setValues((prev) => ({ ...prev, [dim.field]: next }))
              }}
            />
            <p className={cn("text-xs leading-tight", SEVERITY_TEXT[severity])}>{describeValue(dim, value)}</p>
            <input type="hidden" name={dim.field} value={value} />
          </div>
        )
      })}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={existingValues?.notes ?? ""} />
      </div>

      <div className="mt-1 flex gap-2">
        <SubmitButton className="flex-1">
          {existingValues ? "Save changes" : "Save check-in"}
        </SubmitButton>
        {existingValues && (
          <ConfirmDeleteButton
            action={deleteReadiness.bind(null, date)}
            confirmText="Delete this readiness check-in? This cannot be undone."
          />
        )}
      </div>
    </form>
  )
}
