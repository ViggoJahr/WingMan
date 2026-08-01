"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Field, FieldError, FormAlert, SubmitButton, fieldValue } from "@/components/forms/FormParts"
import { idleState } from "@/lib/validation/formState"
import { todayIso } from "@/lib/dates"
import {
  INJURY_GRADES,
  INJURY_GRADE_LABELS,
  INJURY_SITES,
  INJURY_SITE_LABELS,
} from "@/lib/injuries"
import { logInjury, updateInjury } from "./actions"

export interface InjuryDefaults {
  type: string | null
  grade: string | null
  injured_date: string
  cleared_date: string | null
  description: string | null
}

const SELECT_CLASS = "h-9 rounded-md border bg-background px-3 text-sm"

export function InjuryForm({
  mode,
  injuryId,
  defaultValues,
}: {
  mode: "create" | "edit"
  injuryId?: string
  defaultValues?: InjuryDefaults
}) {
  const action = mode === "edit" ? updateInjury.bind(null, injuryId!) : logInjury
  const [state, formAction] = useActionState(action, idleState)
  const v = (name: string, fallback: string | number | null | undefined) =>
    fieldValue(state, name, fallback)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Where</Label>
        <select
          id="type"
          name="type"
          className={SELECT_CLASS}
          defaultValue={v("type", defaultValues?.type ?? "")}
        >
          {INJURY_SITES.map((site) => (
            <option key={site} value={site}>
              {INJURY_SITE_LABELS[site]}
            </option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors?.type} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="grade">How much it stopped you</Label>
        <select
          id="grade"
          name="grade"
          className={SELECT_CLASS}
          defaultValue={v("grade", defaultValues?.grade ?? "limited")}
        >
          {INJURY_GRADES.map((grade) => (
            <option key={grade} value={grade}>
              {INJURY_GRADE_LABELS[grade]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Availability, not a diagnosis - it&apos;s the part you can answer honestly, and the part
          that explains a gap in the load charts.
        </p>
        <FieldError errors={state.fieldErrors?.grade} />
      </div>

      <Field name="injured_date" label="When it started" state={state}>
        <Input
          id="injured_date"
          name="injured_date"
          type="date"
          defaultValue={v("injured_date", defaultValues?.injured_date ?? todayIso())}
          required
        />
      </Field>

      <Field
        name="cleared_date"
        label="When it cleared"
        state={state}
        hint="Leave blank while it's still bothering you - you can close it later in one tap."
      >
        <Input
          id="cleared_date"
          name="cleared_date"
          type="date"
          defaultValue={v("cleared_date", defaultValues?.cleared_date)}
        />
      </Field>

      <Field name="description" label="Notes" state={state}>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="How it happened, what it feels like, what you changed"
          defaultValue={v("description", defaultValues?.description)}
        />
      </Field>

      <SubmitButton className="mt-2">
        {mode === "edit" ? "Save changes" : "Log injury"}
      </SubmitButton>
    </form>
  )
}
