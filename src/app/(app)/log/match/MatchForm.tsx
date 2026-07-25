import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
        <Label htmlFor="opponent">Opponent</Label>
        <Input
          id="opponent"
          name="opponent"
          type="text"
          placeholder="e.g. IFK Kristianstad"
          defaultValue={defaultValues?.opponent ?? ""}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="is_home"
          name="is_home"
          type="checkbox"
          className="h-4 w-4"
          defaultChecked={defaultValues?.is_home ?? true}
        />
        <Label htmlFor="is_home">Home game</Label>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" type="text" defaultValue={defaultValues?.location ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="play_time_min">Minutes played</Label>
        <Input
          id="play_time_min"
          name="play_time_min"
          type="number"
          min={0}
          defaultValue={defaultValues?.play_time_min ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="importance">Importance (1-10)</Label>
          <Input
            id="importance"
            name="importance"
            type="number"
            min={1}
            max={10}
            defaultValue={defaultValues?.importance ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="opposition_difficulty">Opponent difficulty (1-10)</Label>
          <Input
            id="opposition_difficulty"
            name="opposition_difficulty"
            type="number"
            min={1}
            max={10}
            defaultValue={defaultValues?.opposition_difficulty ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="perceived_performance">My performance (1-10)</Label>
          <Input
            id="perceived_performance"
            name="perceived_performance"
            type="number"
            min={1}
            max={10}
            defaultValue={defaultValues?.perceived_performance ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="perceived_challenge">How hard it felt (1-10)</Label>
          <Input
            id="perceived_challenge"
            name="perceived_challenge"
            type="number"
            min={1}
            max={10}
            defaultValue={defaultValues?.perceived_challenge ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rpe">RPE (1-20)</Label>
          <Input id="rpe" name="rpe" type="number" min={1} max={20} defaultValue={defaultValues?.rpe ?? ""} />
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="mb-2 text-sm font-medium">Box score</p>
        <div className="grid grid-cols-2 gap-4">
          {statFields.map((field) => (
            <div key={field.name} className="flex flex-col gap-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type="number"
                min={0}
                defaultValue={defaultValues?.[field.name as keyof MatchDefaults] as number | undefined ?? 0}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="comments">Notes (mental state, how it felt, etc.)</Label>
        <Textarea id="comments" name="comments" rows={3} defaultValue={defaultValues?.comments ?? ""} />
      </div>
      <Button type="submit" className="mt-2">
        {mode === "edit" ? "Save changes" : "Save match"}
      </Button>
    </form>
  )
}
