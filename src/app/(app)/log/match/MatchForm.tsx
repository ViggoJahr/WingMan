"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldError, FormAlert, SubmitButton, fieldValue } from "@/components/forms/FormParts"
import { idleState } from "@/lib/validation/formState"
import { logMatch, updateMatch } from "./actions"

function nowLocalDatetime() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

const statFields: Array<{ name: string; label: string }> = [
  { name: "goals", label: "Goals" },
  { name: "assists", label: "Assists" },
  { name: "shots_missed", label: "Shots missed" },
  { name: "shots_saved", label: "Shots saved (by keeper)" },
  { name: "nine_m_shots", label: "9m shots" },
  { name: "breakthroughs", label: "Breakthroughs" },
  { name: "technical_faults", label: "Technical faults" },
  { name: "suspensions_created", label: "Suspensions won" },
  { name: "suspensions_received", label: "Suspensions received (2 min)" },
  { name: "steals", label: "Steals" },
  { name: "blocks", label: "Blocks" },
  { name: "big_mistakes", label: "Big mistakes" },
]

const ratingFields: Array<{ name: string; label: string; max: number }> = [
  { name: "importance", label: "Importance (1-10)", max: 10 },
  { name: "opposition_difficulty", label: "Opponent difficulty (1-10)", max: 10 },
  { name: "perceived_performance", label: "My performance (1-10)", max: 10 },
  { name: "perceived_challenge", label: "How hard it felt (1-10)", max: 10 },
  { name: "rpe", label: "RPE (1-20)", max: 20 },
]

export interface MatchDefaults {
  start_time: string
  opponent: string | null
  is_home: boolean
  location: string | null
  play_time_min: number | null
  importance: number | null
  opposition_difficulty: number | null
  perceived_performance: number | null
  perceived_challenge: number | null
  rpe: number | null
  comments: string | null
  goals: number
  assists: number
  shots_missed: number
  shots_saved: number
  nine_m_shots: number
  breakthroughs: number
  technical_faults: number
  suspensions_created: number
  suspensions_received: number
  steals: number
  blocks: number
  big_mistakes: number
}

export function MatchForm({
  mode,
  sessionId,
  defaultValues,
}: {
  mode: "create" | "edit"
  sessionId?: string
  defaultValues?: MatchDefaults
}) {
  const action = mode === "edit" ? updateMatch.bind(null, sessionId!) : logMatch
  const [state, formAction] = useActionState(action, idleState)
  const v = (name: string, fallback: string | number | null | undefined) =>
    fieldValue(state, name, fallback)

  // A rejected submit re-renders the form, so the checkbox has to fall back to
  // what was actually submitted rather than the stored value.
  const isHomeChecked =
    state.values != null ? state.values.is_home === "on" : (defaultValues?.is_home ?? true)

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

      <Field name="opponent" label="Opponent" state={state}>
        <Input
          id="opponent"
          name="opponent"
          type="text"
          placeholder="e.g. IFK Kristianstad"
          defaultValue={v("opponent", defaultValues?.opponent)}
        />
      </Field>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            id="is_home"
            name="is_home"
            type="checkbox"
            className="h-4 w-4"
            defaultChecked={isHomeChecked}
          />
          <Label htmlFor="is_home">Home game</Label>
        </div>
        <FieldError errors={state.fieldErrors?.is_home} />
      </div>

      <Field name="location" label="Location" state={state}>
        <Input
          id="location"
          name="location"
          type="text"
          defaultValue={v("location", defaultValues?.location)}
        />
      </Field>

      <Field name="play_time_min" label="Minutes played" state={state}>
        <Input
          id="play_time_min"
          name="play_time_min"
          type="number"
          min={0}
          defaultValue={v("play_time_min", defaultValues?.play_time_min)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        {ratingFields.map((field) => (
          <Field key={field.name} name={field.name} label={field.label} state={state}>
            <Input
              id={field.name}
              name={field.name}
              type="number"
              min={1}
              max={field.max}
              defaultValue={v(
                field.name,
                defaultValues?.[field.name as keyof MatchDefaults] as number | null | undefined
              )}
            />
          </Field>
        ))}
      </div>

      <div className="border-t pt-4">
        <p className="mb-2 text-sm font-medium">Box score</p>
        <div className="grid grid-cols-2 gap-4">
          {statFields.map((field) => (
            <Field key={field.name} name={field.name} label={field.label} state={state}>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={0}
                defaultValue={v(
                  field.name,
                  (defaultValues?.[field.name as keyof MatchDefaults] as number | undefined) ?? 0
                )}
              />
            </Field>
          ))}
        </div>
      </div>

      <Field name="comments" label="Notes (mental state, how it felt, etc.)" state={state}>
        <Textarea
          id="comments"
          name="comments"
          rows={3}
          defaultValue={v("comments", defaultValues?.comments)}
        />
      </Field>

      <SubmitButton className="mt-2">
        {mode === "edit" ? "Save changes" : "Save match"}
      </SubmitButton>
    </form>
  )
}
