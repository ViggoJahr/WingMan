import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { isoDaysAgo, timestampDaysAgo } from "@/lib/dates"
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart"
import { StackedBar } from "@/components/charts/StackedBar"
import {
  SLEEP_STAGES,
  SLEEP_STAGE_FILL,
  SLEEP_STAGE_LABELS,
  formatMinutes,
  hasStageDetail,
  summariseSleepStages,
} from "@/lib/services/sleepStages"
import { SleepChart, StepsChart, WeightChart } from "./charts"

function toPoints(rows: Array<{ date: string; value: number | null }>): TrendPoint[] {
  return rows.filter((r) => r.value != null).map((r) => ({ date: r.date, value: r.value! }))
}

function latestOf(points: TrendPoint[]) {
  return points.at(-1)?.value ?? null
}

export default async function HealthPage() {
  const supabase = await createClient()

  const { data: weightRows } = await supabase
    .from("body_metrics")
    .select("date, weight_kg, body_fat_percentage")
    .gte("date", isoDaysAgo(90))
    .order("date", { ascending: true })

  const { data: dailyRows } = await supabase
    .from("daily_metrics")
    .select("date, steps, resting_heart_rate, avg_hrv_ms, avg_spo2_percentage, active_zone_minutes")
    .gte("date", isoDaysAgo(90))
    .order("date", { ascending: true })

  const { data: sleepRows } = await supabase
    .from("sleep_logs")
    .select("start_time, duration_minutes, sleep_stages")
    .not("duration_minutes", "is", null)
    .gte("start_time", timestampDaysAgo(90))
    .order("start_time", { ascending: true })

  const weightPoints = (weightRows ?? [])
    .filter((r) => r.weight_kg != null)
    .map((r) => ({ date: r.date, weight_kg: r.weight_kg! }))

  // Synced from the scale on every weigh-in and never once charted.
  const bodyFatPoints = toPoints(
    (weightRows ?? []).map((r) => ({ date: r.date, value: r.body_fat_percentage }))
  )
  const latestBodyFat = latestOf(bodyFatPoints)

  const stepsPoints = (dailyRows ?? [])
    .filter((r) => r.steps != null)
    .map((r) => ({ date: r.date, steps: r.steps! }))

  const sleepPoints = (sleepRows ?? [])
    .filter((r) => r.duration_minutes != null)
    .map((r) => ({
      date: r.start_time.slice(0, 10),
      hours: Math.round((r.duration_minutes! / 60) * 10) / 10,
    }))

  // Stage composition, written on every sync since the adapter was built and
  // read by nothing until now.
  //
  // The LONGEST staged sleep in the last week, not the most recent: naps are
  // recorded as sleep_logs too, and picking the latest row surfaced a 1h22m
  // afternoon nap as though it were the night. Not every row carries stages
  // either - some devices do not report them - so this filters to those that do
  // rather than rendering an empty bar.
  const recentStagedSleep = (sleepRows ?? [])
    .filter((row) => row.start_time >= timestampDaysAgo(7))
    .map((row) => ({ row, composition: summariseSleepStages(row.sleep_stages) }))
    .filter((entry) => hasStageDetail(entry.composition))

  const latestStagedSleep = recentStagedSleep.reduce<(typeof recentStagedSleep)[number] | undefined>(
    (longest, entry) =>
      longest == null || entry.composition.inBedMinutes > longest.composition.inBedMinutes
        ? entry
        : longest,
    undefined
  )

  const sleepStageSegments = latestStagedSleep
    ? SLEEP_STAGES.map((stage) => ({
        key: stage,
        label: SLEEP_STAGE_LABELS[stage],
        value: latestStagedSleep.composition.minutes[stage],
        fill: SLEEP_STAGE_FILL[stage],
      }))
    : []

  const restingHrPoints = toPoints((dailyRows ?? []).map((r) => ({ date: r.date, value: r.resting_heart_rate })))
  const hrvPoints = toPoints((dailyRows ?? []).map((r) => ({ date: r.date, value: r.avg_hrv_ms })))
  const spo2Points = toPoints((dailyRows ?? []).map((r) => ({ date: r.date, value: r.avg_spo2_percentage })))
  const azmPoints = toPoints((dailyRows ?? []).map((r) => ({ date: r.date, value: r.active_zone_minutes })))

  const latestWeight = weightPoints.at(-1)
  const avgSteps = stepsPoints.length
    ? Math.round(stepsPoints.reduce((sum, p) => sum + p.steps, 0) / stepsPoints.length)
    : null
  const avgSleep = sleepPoints.length
    ? Math.round((sleepPoints.reduce((sum, p) => sum + p.hours, 0) / sleepPoints.length) * 10) / 10
    : null
  const latestRestingHr = latestOf(restingHrPoints)
  const latestHrv = latestOf(hrvPoints)
  const latestSpo2 = latestOf(spo2Points)
  const avgAzm = azmPoints.length
    ? Math.round(azmPoints.reduce((sum, p) => sum + p.value, 0) / azmPoints.length)
    : null

  return (
    <>

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

      {bodyFatPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {latestBodyFat != null ? `Body fat: ${latestBodyFat}%` : "Body fat"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={bodyFatPoints}
              kind="line"
              color="chart-1"
              format={{ decimals: 1, suffix: "%" }}
            />
          </CardContent>
        </Card>
      )}

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

      {latestStagedSleep && (
        <Card>
          <CardHeader>
            <CardTitle>
              Sleep stages
              {/* Neutral wording: this is whichever sleep was longest, which is
                  usually but not necessarily the night. */}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {latestStagedSleep.row.start_time.slice(0, 10)} - longest of the last 7 days
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <StackedBar segments={sleepStageSegments} formatValue={formatMinutes} />
            <p className="text-xs text-muted-foreground">
              {formatMinutes(latestStagedSleep.composition.asleepMinutes)} asleep of{" "}
              {formatMinutes(latestStagedSleep.composition.inBedMinutes)} in bed
              {latestStagedSleep.composition.efficiency != null &&
                ` - ${Math.round(latestStagedSleep.composition.efficiency * 100)}% efficiency`}
              . Segments under 2% are widened to stay visible; the figures above are exact.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{latestRestingHr ? `Resting HR: ${latestRestingHr} bpm` : "Resting heart rate"}</CardTitle>
        </CardHeader>
        <CardContent>
          {restingHrPoints.length > 0 ? (
            <TrendChart
              data={restingHrPoints}
              kind="line"
              color="chart-1"
              format={{ decimals: 0, suffix: " bpm" }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No resting heart rate data synced yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{latestHrv ? `HRV: ${latestHrv} ms` : "Heart rate variability"}</CardTitle>
        </CardHeader>
        <CardContent>
          {hrvPoints.length > 0 ? (
            <TrendChart data={hrvPoints} kind="line" color="chart-1" format={{ decimals: 1, suffix: " ms" }} />
          ) : (
            <p className="text-sm text-muted-foreground">No HRV data synced yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{latestSpo2 ? `SpO2: ${latestSpo2}%` : "Blood oxygen (SpO2)"}</CardTitle>
        </CardHeader>
        <CardContent>
          {spo2Points.length > 0 ? (
            <TrendChart
              data={spo2Points}
              kind="line"
              color="chart-1"
              format={{ decimals: 1, suffix: "%" }}
              yDomain={[85, 100]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No SpO2 data synced yet.</p>
          )}
          {spo2Points.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Daily median of readings between 70-100%, since the sensor emits a literal 50% when it
              can&apos;t get a reading. Days with too few valid samples are omitted entirely. Wrist-based
              SpO2 is still an estimate - treat single-day dips as sensor noise unless they persist.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{avgAzm != null ? `Active zone min: ${avgAzm} avg/day` : "Active zone minutes"}</CardTitle>
        </CardHeader>
        <CardContent>
          {azmPoints.length > 0 ? (
            <TrendChart data={azmPoints} kind="bar" color="chart-1" format={{ decimals: 0, suffix: " min" }} />
          ) : (
            <p className="text-sm text-muted-foreground">No active zone minute data synced yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
