import { Nav } from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { aggregateWeeklyLoad } from "@/lib/services/trainingLoad"
import { TrainingLoadChart } from "./chart"

export default async function TrainingLoadPage() {
  const supabase = await createClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: sessions } = await supabase
    .from("sessions")
    .select("start_time, end_time, rpe")
    .gte("start_time", ninetyDaysAgo)
    .order("start_time", { ascending: true })

  const weeklyLoad = aggregateWeeklyLoad(sessions ?? [])

  return (
    <div className="flex flex-col">
      <Nav />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Training load</h1>
          <p className="text-muted-foreground">
            Weekly session-RPE load (effort x duration) across all training, last 90 days.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Weekly load</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyLoad.length > 0 ? (
              <TrainingLoadChart data={weeklyLoad} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No sessions with both RPE and a duration yet - load a sync or log a session to
                see this chart.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
