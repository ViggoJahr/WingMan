"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Field, FormAlert, SubmitButton, fieldValue } from "@/components/forms/FormParts"
import { idleState } from "@/lib/validation/formState"
import { updateProfile } from "./actions"

export interface ProfileDefaults {
  height_cm: number | null
  birth_date: string | null
  gender: string | null
}

export function ProfileForm({ defaultValues }: { defaultValues: ProfileDefaults }) {
  const [state, formAction] = useActionState(updateProfile, idleState)
  const v = (name: string, fallback: string | number | null | undefined) =>
    fieldValue(state, name, fallback)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />

      <Field
        name="height_cm"
        label="Height (cm)"
        state={state}
        hint="Entered here rather than synced - it never changes, so it always fell outside the sync window."
      >
        <Input
          id="height_cm"
          name="height_cm"
          type="number"
          step="0.5"
          min={50}
          max={260}
          defaultValue={v("height_cm", defaultValues.height_cm)}
        />
      </Field>

      <Field
        name="birth_date"
        label="Date of birth"
        state={state}
        hint="Used for age-based max heart rate once heart-rate load lands."
      >
        <Input
          id="birth_date"
          name="birth_date"
          type="date"
          defaultValue={v("birth_date", defaultValues.birth_date)}
        />
      </Field>

      <Field name="gender" label="Gender" state={state} hint="Feeds the TRIMP coefficient.">
        <select
          id="gender"
          name="gender"
          className="h-9 rounded-md border bg-background px-3 text-sm"
          defaultValue={v("gender", defaultValues.gender)}
        >
          <option value="">Not set</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <SubmitButton className="w-fit">Save profile</SubmitButton>
    </form>
  )
}
