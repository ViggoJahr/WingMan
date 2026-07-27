"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field, FieldError, FormAlert, SubmitButton, fieldValue } from "@/components/forms/FormParts"
import { idleState } from "@/lib/validation/formState"
import { logWorkout, updateWorkout } from "./actions"

function nowLocalDatetime() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

const TYPE_LABEL: Record<string, string> = {
  cardio: "Cardio / sport",
  strength_power: "Strength",
  mobility_rehab: "Mobility / rehab",
  active_rest: "Active rest",
}

export interface WorkoutDefaults {
  type: string
  focus: string | null
  start_time: string
  duration_minutes: number
  distance_km: number | null
  rpe: number | null
  location: string | null
}

export function WorkoutForm({
  mode,
  sessionId,
  defaultValues,
}: {
  mode: "create" | "edit"
  sessionId?: string
  defaultValues?: WorkoutDefaults
}) {
  const action = mode === "edit" ? updateWorkout.bind(null, sessionId!) : logWorkout
  const [state, formAction] = useActionState(action, idleState)
  const v = (name: string, fallback: string | number | null | undefined) =>
    fieldValue(state, name, fallback)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type</Label>
        {mode === "edit" ? (
          <>
            <p className="text-sm text-muted-foreground">
              {TYPE_LABEL[defaultValues!.type] ?? defaultValues!.type} (can&apos;t be changed - delete
              and re-log to change type)
            </p>
            <input type="hidden" name="type" value={defaultValues!.type} />
          </>
        ) : (
          <select
            id="type"
            name="type"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            defaultValue={v("type", "cardio")}
          >
            <option value="cardio">Cardio / sport</option>
            <option value="strength_power">Strength</option>
            <option value="mobility_rehab">Mobility / rehab</option>
            <option value="active_rest">Active rest</option>
          </select>
        )}
        <FieldError errors={state.fieldErrors?.type} />
      </div>

      <Field name="focus" label="Sport / focus" state={state}>
        <Input
          id="focus"
          name="focus"
          type="text"
          placeholder="e.g. Basketball, Running, Yoga"
          defaultValue={v("focus", defaultValues?.focus)}
        />
      </Field>

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
          defaultValue={v("duration_minutes", defaultValues?.duration_minutes ?? 45)}
          required
        />
      </Field>

      <Field name="distance_km" label="Distance (km, optional)" state={state}>
        <Input
          id="distance_km"
          name="distance_km"
          type="number"
          step="0.01"
          min={0}
          defaultValue={v("distance_km", defaultValues?.distance_km)}
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

      <Field name="location" label="Location" state={state}>
        <Input
          id="location"
          name="location"
          type="text"
          defaultValue={v("location", defaultValues?.location)}
        />
      </Field>

      <SubmitButton className="mt-2">
        {mode === "edit" ? "Save changes" : "Save workout"}
      </SubmitButton>
    </form>
  )
}
