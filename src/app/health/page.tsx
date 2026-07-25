import { Nav } from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { SleepChart, StepsChart, WeightChart } from "./charts"

export default async function HealthPage() {
  const supabase = await createClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: weightRows } = await supabase
    .from("body_metrics")
    .select("date, weight_kg")
    .not("weight_kg", "is", null)
    .gte("date", ninetyDaysAgo.toISOString().slice(0, 10))
    .order("date", { ascending: true })

  const { data: stepRows } = await supabase
    .from("daily_metrics")
    .select("date, steps")
    .not("steps", "is", null)
    .gte("date", ninetyDaysAgo.toISOString().slice(0, 10))
    .order("date", { ascending: true })

  const { data: sleepRows } = await supabase
    .from("sleep_logs")
    .select("start_time, duration_minutes")
    .not("duration_minutes", "is", null)
    .gte("start_time", ninetyDaysAgo.toISOString())
    .order("start_time", { ascending: true })

  const weightPoints = (weightRows ?? [])
    .filter((r) => r.weight_kg != null)
    .map((r) => ({ date: r.date, weight_kg: r.weight_kg! }))

  const stepsPoints = (stepRows ?? [])
    .filter((r) => r.steps != null)
    .map((r) => ({ date: r.date, steps: r.steps! }))

  const sleepPoints = (sleepRows ?? [])
    .filter((r) => r.duration_minutes != null)
    .map((r) => ({
      date: r.start_time.slice(0, 10),
      hours: Math.round((r.duration_minutes! / 60) * 10) / 10,
    }))

  const latestWeight = weightPoints.at(-1)
  const avgSteps = stepsPoints.length
    ? Math.round(stepsPoints.reduce((sum, p) => sum + p.steps, 0) / stepsPoints.length)
    : null
  const avgSleep = sleepPoints.length
    ? Math.round((sleepPoints.reduce((sum, p) => sum + p.hours, 0) / sleepPoints.length) * 10) / 10
    : null

  return (
    <div className="flex flex-col">
      <Nav />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Body &amp; recovery</h1>
          <p className="text-muted-foreground">
            Weight, steps, and sleep synced from Google Health - last 90 days.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{latestWeight ? `Weight: ${latestWeight.weight_kg} kg` : "Weight"}</CardTitle>
          </CardHeader>
          <CardContent>
            {weightPoints.length > 0 ? (
              <WeightChart data={weightPoints} />
            ) : (
              <p className="text-sm text-muted-foreground">No weight data synced yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{avgSteps ? `Steps: ${avgSteps.toLocaleString()} avg/day` : "Steps"}</CardTitle>
          </CardHeader>
          <CardContent>
            {stepsPoints.length > 0 ? (
              <StepsChart data={stepsPoints} />
            ) : (
              <p className="text-sm text-muted-foreground">No step data synced yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{avgSleep ? `Sleep: ${avgSleep}h avg/night` : "Sleep"}</CardTitle>
          </CardHeader>
          <CardContent>
            {sleepPoints.length > 0 ? (
              <SleepChart data={sleepPoints} />
            ) : (
              <p className="text-sm text-muted-foreground">No sleep data synced yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
