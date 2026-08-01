"use client"

import Link from "next/link"
import { useActionState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Field, FieldError, FormAlert, SubmitButton, fieldValue } from "@/components/forms/FormParts"
import { idleState } from "@/lib/validation/formState"
import { nowLocalDatetime } from "@/lib/dates"
import { attachMatch, logMatch, updateMatch } from "./actions"

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
  minutes_period_1: number | null
  minutes_period_2: number | null
  plus_minus: number | null
  importance: number | null
  opposition_difficulty: number | null
  perceived_performance: number | null
  perceived_challenge: number | null
  rpe: number | null
  comments: string | null
}

export function MatchForm({
  mode,
  sessionId,
  defaultValues,
  eventCount = 0,
}: {
  /** See PracticeForm - "attach" fills in a session the watch already detected. */
  mode: "create" | "edit" | "attach"
  sessionId?: string
  defaultValues?: MatchDefaults
  /** Events already tagged, so the edit form can point at the review page. */
  eventCount?: number
}) {
  const isAttach = mode === "attach"
  const action =
    mode === "edit"
      ? updateMatch.bind(null, sessionId!)
      : isAttach
        ? attachMatch.bind(null, sessionId!)
        : logMatch
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

      {isAttach ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Attaching to a session your watch already recorded. Its timing stays as measured; you add
          the match detail.
          <input type="hidden" name="start_time" value={defaultValues?.start_time ?? ""} />
        </p>
      ) : (
        <Field name="start_time" label="Start time" state={state}>
          <Input
            id="start_time"
            name="start_time"
            type="datetime-local"
            defaultValue={v("start_time", defaultValues?.start_time ?? nowLocalDatetime())}
            required
          />
        </Field>
      )}

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

      <Field name="play_time_min" label="Minutes played (total)" state={state}>
        <Input
          id="play_time_min"
          name="play_time_min"
          type="number"
          min={0}
          defaultValue={v("play_time_min", defaultValues?.play_time_min)}
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field name="minutes_period_1" label="1st half" state={state}>
          <Input
            id="minutes_period_1"
            name="minutes_period_1"
            type="number"
            min={0}
            max={40}
            defaultValue={v("minutes_period_1", defaultValues?.minutes_period_1)}
          />
        </Field>
        <Field name="minutes_period_2" label="2nd half" state={state}>
          <Input
            id="minutes_period_2"
            name="minutes_period_2"
            type="number"
            min={0}
            max={40}
            defaultValue={v("minutes_period_2", defaultValues?.minutes_period_2)}
          />
        </Field>
        <Field name="plus_minus" label="+/-" state={state} hint="On court">
          <Input
            id="plus_minus"
            name="plus_minus"
            type="number"
            min={-60}
            max={60}
            defaultValue={v("plus_minus", defaultValues?.plus_minus)}
          />
        </Field>
      </div>

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

      {/* The box score is no longer typed here - it is counted from the events
          tagged against the video, so there is nothing to keep in sync. */}
      <div className="flex flex-col gap-2 rounded-md border border-dashed p-4 text-sm">
        <p className="font-medium">Box score</p>
        <p className="text-muted-foreground">
          {mode === "edit" && eventCount > 0
            ? `Counted from ${eventCount} tagged event${eventCount === 1 ? "" : "s"}.`
            : "Tag goals, assists and mistakes against the video after the match - the box score is counted from them."}
        </p>
        {mode === "edit" && sessionId && (
          <Link
            href={`/sessions/${sessionId}/review`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}
          >
            {eventCount > 0 ? "Review video" : "Tag events from video"}
          </Link>
        )}
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
        {mode === "edit" ? "Save changes" : isAttach ? "Attach match detail" : "Save match"}
      </SubmitButton>
    </form>
  )
}
