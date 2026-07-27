"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FormAlert, SubmitButton, fieldValue } from "@/components/forms/FormParts"
import { idleState } from "@/lib/validation/formState"
import { logPractice, updatePractice } from "./actions"

function nowLocalDatetime() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export interface PracticeDefaults {
  start_time: string
  duration_minutes: number
  location: string | null
  rpe: number | null
  practice_focus: string | null
  defense_vs_attack_ratio: string | null
  tactical_complexity: number | null
  comments: string | null
}

export function PracticeForm({
  mode,
  sessionId,
  defaultValues,
}: {
  mode: "create" | "edit"
  sessionId?: string
  defaultValues?: PracticeDefaults
}) {
  const action = mode === "edit" ? updatePractice.bind(null, sessionId!) : logPractice
  const [state, formAction] = useActionState(action, idleState)
  const v = (name: string, fallback: string | number | null | undefined) =>
    fieldValue(state, name, fallback)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />

      <Field name="start_time" label="Start time" state={state}>
        <Input
          id="start_time"
          name="start_time"
          type="datetime-local"
          defaultValue={v("start_time", defaultValues?.start_time ?? nowLocalDatetime())}
          required
        />
      </Field>

      <Field name="duration_minutes" label="Duration (minutes)" state={state}>
        <Input
          id="duration_minutes"
          name="duration_minutes"
          type="number"
          min={1}
          defaultValue={v("duration_minutes", defaultValues?.duration_minutes ?? 60)}
          required
        />
      </Field>

      <Field name="location" label="Location" state={state}>
        <Input
          id="location"
          name="location"
          type="text"
          placeholder="e.g. Täby sporthall"
          defaultValue={v("location", defaultValues?.location)}
        />
      </Field>

      <Field name="rpe" label="RPE (1-20)" state={state}>
        <Input
          id="rpe"
          name="rpe"
          type="number"
          min={1}
          max={20}
          defaultValue={v("rpe", defaultValues?.rpe)}
        />
      </Field>

      <Field name="practice_focus" label="Focus" state={state}>
        <Input
          id="practice_focus"
          name="practice_focus"
          type="text"
          placeholder="e.g. Defense - 1v1 emphasis, shooting, team play"
          defaultValue={v("practice_focus", defaultValues?.practice_focus)}
        />
      </Field>

      <Field name="defense_vs_attack_ratio" label="Defense / offense split" state={state}>
        <Input
          id="defense_vs_attack_ratio"
          name="defense_vs_attack_ratio"
          type="text"
          placeholder="e.g. 60/40"
          defaultValue={v("defense_vs_attack_ratio", defaultValues?.defense_vs_attack_ratio)}
        />
      </Field>

      <Field name="tactical_complexity" label="Tactical complexity (1-10)" state={state}>
        <Input
          id="tactical_complexity"
          name="tactical_complexity"
          type="number"
          min={1}
          max={10}
          defaultValue={v("tactical_complexity", defaultValues?.tactical_complexity)}
        />
      </Field>

      <Field name="comments" label="Notes" state={state}>
        <Textarea
          id="comments"
          name="comments"
          rows={3}
          defaultValue={v("comments", defaultValues?.comments)}
        />
      </Field>

      <SubmitButton className="mt-2">
        {mode === "edit" ? "Save changes" : "Save practice"}
      </SubmitButton>
    </form>
  )
}
