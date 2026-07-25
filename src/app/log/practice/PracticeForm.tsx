import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="start_time">Start time</Label>
        <Input
          id="start_time"
          name="start_time"
          type="datetime-local"
          defaultValue={defaultValues?.start_time ?? nowLocalDatetime()}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="duration_minutes">Duration (minutes)</Label>
        <Input
          id="duration_minutes"
          name="duration_minutes"
          type="number"
          min={1}
          defaultValue={defaultValues?.duration_minutes ?? 60}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          type="text"
          placeholder="e.g. Täby sporthall"
          defaultValue={defaultValues?.location ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rpe">RPE (1-20)</Label>
        <Input id="rpe" name="rpe" type="number" min={1} max={20} defaultValue={defaultValues?.rpe ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="practice_focus">Focus</Label>
        <Input
          id="practice_focus"
          name="practice_focus"
          type="text"
          placeholder="e.g. Defense - 1v1 emphasis, shooting, team play"
          defaultValue={defaultValues?.practice_focus ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="defense_vs_attack_ratio">Defense / offense split</Label>
        <Input
          id="defense_vs_attack_ratio"
          name="defense_vs_attack_ratio"
          type="text"
          placeholder="e.g. 60/40"
          defaultValue={defaultValues?.defense_vs_attack_ratio ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="tactical_complexity">Tactical complexity (1-10)</Label>
        <Input
          id="tactical_complexity"
          name="tactical_complexity"
          type="number"
          min={1}
          max={10}
          defaultValue={defaultValues?.tactical_complexity ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="comments">Notes</Label>
        <Textarea id="comments" name="comments" rows={3} defaultValue={defaultValues?.comments ?? ""} />
      </div>
      <Button type="submit" className="mt-2">
        {mode === "edit" ? "Save changes" : "Save practice"}
      </Button>
    </form>
  )
}
