import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type</Label>
        {mode === "edit" ? (
          <>
            <p className="text-sm text-muted-foreground">
              {TYPE_LABEL[defaultValues!.type] ?? defaultValues!.type} (can&apos;t be changed - delete and
              re-log to change type)
            </p>
            <input type="hidden" name="type" value={defaultValues!.type} />
          </>
        ) : (
          <select
            id="type"
            name="type"
            className="h-9 rounded-md border bg-background px-3 text-sm"
            defaultValue="cardio"
          >
            <option value="cardio">Cardio / sport</option>
            <option value="strength_power">Strength</option>
            <option value="mobility_rehab">Mobility / rehab</option>
            <option value="active_rest">Active rest</option>
          </select>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="focus">Sport / focus</Label>
        <Input
          id="focus"
          name="focus"
          type="text"
          placeholder="e.g. Basketball, Running, Yoga"
          defaultValue={defaultValues?.focus ?? ""}
        />
      </div>
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
          defaultValue={defaultValues?.duration_minutes ?? 45}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="distance_km">Distance (km, optional)</Label>
        <Input
          id="distance_km"
          name="distance_km"
          type="number"
          step="0.01"
          min={0}
          defaultValue={defaultValues?.distance_km ?? ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rpe">RPE (1-20)</Label>
        <Input id="rpe" name="rpe" type="number" min={1} max={20} defaultValue={defaultValues?.rpe ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" type="text" defaultValue={defaultValues?.location ?? ""} />
      </div>
      <Button type="submit" className="mt-2">
        {mode === "edit" ? "Save changes" : "Save workout"}
      </Button>
    </form>
  )
}
