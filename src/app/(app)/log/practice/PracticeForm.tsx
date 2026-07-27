"use client"

import { useActionState, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { ChipGroup, ChipMultiGroup, type ChipOption } from "@/components/forms/ChipGroup"
import { Field, FormAlert, SubmitButton, fieldValue } from "@/components/forms/FormParts"
import { idleState } from "@/lib/validation/formState"
import { RPE_CHOICES } from "@/lib/rpe"
import {
  HANDBALL_POSITIONS,
  LOAD_BANDS,
  POSITION_LABELS,
  PRACTICE_DURATIONS,
  PRACTICE_FOCUS_OPTIONS,
  THROW_BANDS,
} from "@/lib/handball/vocab"
import { logPractice, updatePractice } from "./actions"

function nowLocalDatetime() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

const RPE_OPTIONS: ChipOption[] = RPE_CHOICES.map((choice) => ({
  value: choice.value,
  label: choice.label,
  hint: `RPE ${choice.value} - ${choice.hint}`,
}))

const POSITION_OPTIONS: ChipOption[] = HANDBALL_POSITIONS.map((position) => ({
  value: position,
  label: POSITION_LABELS[position],
}))

/**
 * A duration logged before the chip set existed (or hand-edited) has to stay
 * selectable on edit, otherwise opening the form silently blanks a required
 * field and the save fails on a value the user never touched.
 */
function durationOptions(current: number | null | undefined): ChipOption[] {
  const minutes = [...PRACTICE_DURATIONS] as number[]
  if (current != null && !minutes.includes(current)) minutes.push(current)
  return minutes.sort((a, b) => a - b).map((m) => ({ value: m, label: `${m} min` }))
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
  throws_count: number | null
  jump_load: number | null
  contact_load: number | null
  position: string | null
  perceived_performance: number | null
}

export function PracticeForm({
  mode,
  sessionId,
  defaultValues,
  defaultPosition,
}: {
  mode: "create" | "edit"
  sessionId?: string
  defaultValues?: PracticeDefaults
  /** Position from the most recent handball session, so the usual case is zero taps. */
  defaultPosition?: string | null
}) {
  const action = mode === "edit" ? updatePractice.bind(null, sessionId!) : logPractice
  const [state, formAction] = useActionState(action, idleState)
  const v = (name: string, fallback: string | number | null | undefined) =>
    fieldValue(state, name, fallback)

  const [performance, setPerformance] = useState<number>(
    defaultValues?.perceived_performance ?? 6
  )

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormAlert state={state} />

      <Field name="duration_minutes" label="How long?" state={state}>
        <ChipGroup
          name="duration_minutes"
          options={durationOptions(defaultValues?.duration_minutes)}
          defaultValue={v("duration_minutes", defaultValues?.duration_minutes ?? 90)}
          clearable={false}
        />
      </Field>

      <Field name="rpe" label="How hard?" state={state}>
        <ChipGroup
          name="rpe"
          options={RPE_OPTIONS}
          defaultValue={v("rpe", defaultValues?.rpe)}
        />
      </Field>

      <Field
        name="throws_count"
        label="Throwing volume"
        state={state}
        hint="Shoulder load. Roughly how much did you throw?"
      >
        <ChipGroup
          name="throws_count"
          options={THROW_BANDS}
          defaultValue={v("throws_count", defaultValues?.throws_count)}
        />
      </Field>

      <Field name="jump_load" label="Jumping / landing" state={state}>
        <ChipGroup
          name="jump_load"
          options={LOAD_BANDS}
          defaultValue={v("jump_load", defaultValues?.jump_load)}
        />
      </Field>

      <Field name="contact_load" label="Contact / duels" state={state}>
        <ChipGroup
          name="contact_load"
          options={LOAD_BANDS}
          defaultValue={v("contact_load", defaultValues?.contact_load)}
        />
      </Field>

      <Field name="position" label="Position" state={state}>
        <ChipGroup
          name="position"
          options={POSITION_OPTIONS}
          defaultValue={v("position", defaultValues?.position ?? defaultPosition)}
        />
      </Field>

      <Field name="practice_focus" label="Focus" state={state}>
        <ChipMultiGroup
          name="practice_focus"
          options={PRACTICE_FOCUS_OPTIONS}
          defaultValue={v("practice_focus", defaultValues?.practice_focus)}
          allowOther
          otherPlaceholder="Anything else, comma separated"
        />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">How did it go?</Label>
          <span className="text-sm font-semibold">{performance}/10</span>
        </div>
        <Slider
          min={1}
          max={10}
          step={1}
          value={[performance]}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value
            setPerformance(next)
          }}
        />
        <input type="hidden" name="perceived_performance" value={performance} />
      </div>

      <details className="rounded-md border px-3 py-2">
        <summary className="cursor-pointer text-sm text-muted-foreground">
          Time, place and notes
        </summary>

        <div className="mt-3 flex flex-col gap-4">
          <Field name="start_time" label="Start time" state={state}>
            <Input
              id="start_time"
              name="start_time"
              type="datetime-local"
              defaultValue={v("start_time", defaultValues?.start_time ?? nowLocalDatetime())}
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

          <Field name="comments" label="Notes" state={state}>
            <Textarea
              id="comments"
              name="comments"
              rows={3}
              defaultValue={v("comments", defaultValues?.comments)}
            />
          </Field>

          {/* Kept on edit only: both were slow to fill and neither is trended
              anywhere, so they no longer sit in the create path. */}
          {mode === "edit" && (
            <>
              <Field name="defense_vs_attack_ratio" label="Defense / offense split" state={state}>
                <Input
                  id="defense_vs_attack_ratio"
                  name="defense_vs_attack_ratio"
                  type="text"
                  placeholder="e.g. 60/40"
                  defaultValue={v(
                    "defense_vs_attack_ratio",
                    defaultValues?.defense_vs_attack_ratio
                  )}
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
            </>
          )}
        </div>
      </details>

      <SubmitButton>{mode === "edit" ? "Save changes" : "Save practice"}</SubmitButton>
    </form>
  )
}
