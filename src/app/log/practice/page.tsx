import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { logPractice } from "./actions"

function nowLocalDatetime() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export default function LogPracticePage() {
  return (
    <div className="flex flex-col">
      <Nav />
      <div className="flex justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Log practice</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={logPractice} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="start_time">Start time</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="datetime-local"
                  defaultValue={nowLocalDatetime()}
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
                  defaultValue={60}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" type="text" placeholder="e.g. Täby sporthall" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="rpe">RPE (1-20)</Label>
                <Input id="rpe" name="rpe" type="number" min={1} max={20} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="practice_focus">Focus</Label>
                <Input
                  id="practice_focus"
                  name="practice_focus"
                  type="text"
                  placeholder="e.g. Defense - 1v1 emphasis, shooting, team play"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="defense_vs_attack_ratio">Defense / offense split</Label>
                <Input
                  id="defense_vs_attack_ratio"
                  name="defense_vs_attack_ratio"
                  type="text"
                  placeholder="e.g. 60/40"
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
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="comments">Notes</Label>
                <Textarea id="comments" name="comments" rows={3} />
              </div>
              <Button type="submit" className="mt-2">
                Save practice
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
