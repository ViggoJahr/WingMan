import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { logWorkout } from "./actions"

function nowLocalDatetime() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export default function LogWorkoutPage() {
  return (
    <div className="flex flex-col">
      <Nav />
      <div className="flex justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Log a workout</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={logWorkout} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="type">Type</Label>
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
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="focus">Sport / focus</Label>
                <Input id="focus" name="focus" type="text" placeholder="e.g. Basketball, Running, Yoga" />
              </div>
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
                  defaultValue={45}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="distance_km">Distance (km, optional)</Label>
                <Input id="distance_km" name="distance_km" type="number" step="0.01" min={0} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="rpe">RPE (1-20)</Label>
                <Input id="rpe" name="rpe" type="number" min={1} max={20} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" type="text" />
              </div>
              <Button type="submit" className="mt-2">
                Save workout
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
