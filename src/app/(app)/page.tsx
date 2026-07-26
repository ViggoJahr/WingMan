import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { READINESS_DIMENSIONS, WARNING_THRESHOLD, describeValue } from "@/lib/services/readinessDimensions"
import { fetchDailyFacts, type DailyFactRow } from "@/lib/services/dailyFacts"
import { todayIso } from "@/lib/dates"
import { ACWR_BAND_LABEL, acwrBand, computeLoadMetrics } from "@/lib/services/loadMetrics"
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap"
import { StatTile, type TileStatus } from "@/components/StatTile"
import { SessionList, type SessionRowData } from "@/components/SessionRow"

// The heatmap shows 26 weeks; ACWR needs 28 days of history before that to be
// meaningful, so pull a little over 200 days in one query.
const HISTORY_DAYS = 210
const HEATMAP_WEEKS = 26

function num(value: number | null | undefined): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function sumOf(rows: DailyFactRow[], key: keyof DailyFactRow): number {
  return rows.reduce((acc, row) => acc + (num(row[key] as number | null) ?? 0), 0)
}

function averageOf(rows: DailyFactRow[], key: keyof DailyFactRow): number | null {
  const values = rows.map((r) => num(r[key] as number | null)).filter((v): v is number => v != null)
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function percentChange(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return undefined
  return { percent: ((current - previous) / Math.abs(previous)) * 100 }
}

function readinessStatus(score: number): TileStatus {
  if (score >= 70) return "good"
  if (score >= 50) return "warning"
  return "critical"
}

function acwrStatus(acwr: number): TileStatus {
  const band = acwrBand(acwr)
  if (band === "optimal") return "good"
  if (band === "caution") return "warning"
  if (band === "high") return "critical"
  return "warning"
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ logged?: string }>
}) {
  const { logged } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = todayIso()

  const [facts, { data: sessions }] = await Promise.all([
    fetchDailyFacts(supabase, { days: HISTORY_DAYS }),
    supabase
      .from("sessions")
      .select(
        "id, type, start_time, rpe, calories_kcal, external_source, cardio_sessions(focus, avg_hr), strength_sessions(focus)"
      )
      .is("merged_into", null)
      .order("start_time", { ascending: false })
      .limit(10),
  ])

  const last7 = facts.slice(-7)
  const prev7 = facts.slice(-14, -7)

  // Rolling load metrics over the whole window; only the latest day is shown.
  const loadMetrics = computeLoadMetrics(facts.map((f) => ({ day: f.day, load: num(f.total_load) ?? 0 })))
  const latestMetrics = loadMetrics[loadMetrics.length - 1]

  const todaysFact = facts.find((f) => f.day === today)
  const latestReadinessFact = [...facts].reverse().find((f) => f.readiness_score != null)

  const injuryDim = READINESS_DIMENSIONS.find((d) => d.field === "current_injury")!
  const illnessDim = READINESS_DIMENSIONS.find((d) => d.field === "current_illness")!
  const healthWarnings = latestReadinessFact
    ? [
        (num(latestReadinessFact.current_injury) ?? 0) >= WARNING_THRESHOLD
          ? { label: "Injury", description: describeValue(injuryDim, num(latestReadinessFact.current_injury)!) }
          : null,
        (num(latestReadinessFact.current_illness) ?? 0) >= WARNING_THRESHOLD
          ? { label: "Illness", description: describeValue(illnessDim, num(latestReadinessFact.current_illness)!) }
          : null,
      ].filter((w): w is { label: string; description: string } => w != null)
    : []

  const weeklyLoad = sumOf(last7, "total_load")
  const prevWeeklyLoad = sumOf(prev7, "total_load")
  const avgSteps = averageOf(last7, "steps")
  const prevAvgSteps = averageOf(prev7, "steps")
  const avgSleep = averageOf(last7, "sleep_hours")
  const prevAvgSleep = averageOf(prev7, "sleep_hours")
  const readinessScore = num(todaysFact?.readiness_score)
  const avgReadiness = averageOf(last7, "readiness_score")
  const prevAvgReadiness = averageOf(prev7, "readiness_score")

  const weightFacts = facts.filter((f) => num(f.weight_kg) != null)
  const latestWeight = weightFacts[weightFacts.length - 1]
  const priorWeight = weightFacts.filter((f) => f.day <= (latestWeight?.day ?? "")).slice(-30)[0]

  const heatmapDays = facts.map((f) => ({
    day: f.day,
    value: num(f.total_load) ?? 0,
    marked: f.had_match === true,
  }))

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Training Hub</h1>
        <p className="text-muted-foreground">Signed in as {user?.email}</p>
        {logged && (
          <p className="mt-2 rounded-md bg-secondary p-2 text-sm text-secondary-foreground">
            Saved your {logged} log.
          </p>
        )}
      </div>

      {healthWarnings.length > 0 && (
        <div className="rounded-md border border-status-critical/50 bg-status-critical/10 p-3 text-sm">
          <p className="font-medium text-status-critical">
            Consider adjusting training
            {latestReadinessFact && latestReadinessFact.day !== today && ` (from ${latestReadinessFact.day})`}
          </p>
          <ul className="mt-1 list-disc pl-5 text-foreground">
            {healthWarnings.map((w) => (
              <li key={w.label}>
                <span className="font-medium">{w.label}:</span> {w.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!todaysFact?.readiness_score && (
        <Link
          href="/log/readiness"
          className="rounded-md border border-dashed p-4 text-sm hover:bg-accent"
        >
          <span className="font-medium">You haven&apos;t logged readiness today.</span>{" "}
          <span className="text-muted-foreground">Tap to check in.</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Readiness today"
          value={readinessScore != null ? `${readinessScore}` : "-"}
          hint={readinessScore != null ? "out of 100" : "not logged"}
          status={readinessScore != null ? readinessStatus(readinessScore) : "neutral"}
          href="/readiness"
          delta={
            percentChange(avgReadiness, prevAvgReadiness) && {
              ...percentChange(avgReadiness, prevAvgReadiness)!,
              goodDirection: "up",
              periodLabel: "7d avg",
            }
          }
          sparkline={facts.slice(-28).map((f) => num(f.readiness_score) ?? 0)}
        />

        <StatTile
          label="Acute:chronic load"
          value={latestMetrics?.acwr != null ? latestMetrics.acwr.toFixed(2) : "-"}
          hint={latestMetrics?.acwr != null ? ACWR_BAND_LABEL[acwrBand(latestMetrics.acwr)] : "needs 28 days"}
          status={latestMetrics?.acwr != null ? acwrStatus(latestMetrics.acwr) : "neutral"}
          href="/training-load"
          sparkline={loadMetrics
            .slice(-28)
            .map((m) => m.acwr)
            .filter((v): v is number => v != null)}
        />

        <StatTile
          label="Load (7d)"
          value={Math.round(weeklyLoad).toString()}
          hint={latestMetrics?.monotony != null ? `monotony ${latestMetrics.monotony.toFixed(2)}` : undefined}
          href="/training-load"
          delta={
            percentChange(weeklyLoad, prevWeeklyLoad) && {
              ...percentChange(weeklyLoad, prevWeeklyLoad)!,
              goodDirection: "none",
              periodLabel: "vs prev 7d",
            }
          }
          sparkline={facts.slice(-28).map((f) => num(f.total_load) ?? 0)}
        />

        <StatTile
          label="Sleep (7d avg)"
          value={avgSleep != null ? `${avgSleep.toFixed(1)} h` : "-"}
          href="/health"
          delta={
            percentChange(avgSleep, prevAvgSleep) && {
              ...percentChange(avgSleep, prevAvgSleep)!,
              goodDirection: "up",
              periodLabel: "vs prev 7d",
            }
          }
          sparkline={facts.slice(-28).map((f) => num(f.sleep_hours) ?? 0)}
        />

        <StatTile
          label="Avg steps (7d)"
          value={avgSteps != null ? Math.round(avgSteps).toLocaleString() : "-"}
          href="/health"
          delta={
            percentChange(avgSteps, prevAvgSteps) && {
              ...percentChange(avgSteps, prevAvgSteps)!,
              goodDirection: "up",
              periodLabel: "vs prev 7d",
            }
          }
          sparkline={facts.slice(-28).map((f) => num(f.steps) ?? 0)}
        />

        <StatTile
          label="Weight"
          value={latestWeight ? `${num(latestWeight.weight_kg)!.toFixed(1)} kg` : "-"}
          hint={latestWeight && latestWeight.day !== today ? `as of ${latestWeight.day}` : undefined}
          href="/health"
          delta={
            latestWeight && priorWeight && priorWeight.day !== latestWeight.day
              ? {
                  ...percentChange(num(latestWeight.weight_kg), num(priorWeight.weight_kg))!,
                  goodDirection: "none",
                  periodLabel: "recent",
                }
              : undefined
          }
          sparkline={weightFacts.slice(-30).map((f) => num(f.weight_kg) ?? 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap
            days={heatmapDays}
            weeks={HEATMAP_WEEKS}
            metricLabel="training load"
            valueFormat={{ decimals: 0, prefix: "load " }}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href="/log/practice" className={cn(buttonVariants({ size: "sm" }))}>
          + Practice
        </Link>
        <Link href="/log/match" className={cn(buttonVariants({ size: "sm" }))}>
          + Match
        </Link>
        <Link href="/log/workout" className={cn(buttonVariants({ size: "sm" }))}>
          + Workout
        </Link>
        <Link
          href="/log/readiness"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          + Readiness check-in
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent workouts</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionList
            sessions={(sessions ?? []).map((s) => ({
              ...s,
              cardio_sessions: s.cardio_sessions as unknown as SessionRowData["cardio_sessions"],
              strength_sessions: s.strength_sessions as unknown as SessionRowData["strength_sessions"],
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
