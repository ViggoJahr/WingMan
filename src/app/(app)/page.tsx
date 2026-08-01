import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PageShell } from "@/components/PageShell"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { READINESS_DIMENSIONS, WARNING_THRESHOLD, describeValue } from "@/lib/services/readinessDimensions"
import { fetchDailyFacts, factNumber as num, type DailyFactRow } from "@/lib/services/dailyFacts"
import { sessionTypeLabel } from "@/lib/labels"
import { isoDaysAgo, todayIso } from "@/lib/dates"
import { injuryDurationDays, injurySiteLabel } from "@/lib/injuries"
import {
  ACWR_BAND_LABEL,
  acwrBand,
  computeLoadMetrics,
  intensityCoverage,
} from "@/lib/services/loadMetrics"
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap"
import { ProgressRing } from "@/components/charts/ProgressRing"
import { WeekDotStrip } from "@/components/charts/WeekDotStrip"
import { StatTile, type TileStatus } from "@/components/StatTile"
import { SessionList, type SessionRowData } from "@/components/SessionRow"
import { RpeQuickSet } from "@/components/RpeQuickSet"

// The heatmap shows 26 weeks; ACWR needs 28 days of history before that to be
// meaningful, so pull a little over 200 days in one query.
const HISTORY_DAYS = 210
const HEATMAP_WEEKS = 26
const CHRONIC_WINDOW_DAYS = 28

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

  const [facts, { data: sessions }, { data: injuries }] = await Promise.all([
    fetchDailyFacts(supabase, { days: HISTORY_DAYS }),
    supabase
      .from("sessions")
      .select(
        "id, type, start_time, rpe, manual_rpe, calories_kcal, external_source, cardio_sessions(focus, avg_hr), strength_sessions(focus)"
      )
      .is("merged_into", null)
      .order("start_time", { ascending: false })
      .limit(10),
    supabase
      .from("injuries")
      .select("id, type, grade, injured_date, cleared_date")
      .gte("injured_date", isoDaysAgo(HISTORY_DAYS))
      .order("injured_date", { ascending: false }),
  ])

  const openInjuries = (injuries ?? []).filter((i) => i.cleared_date == null)

  const last7 = facts.slice(-7)
  const prev7 = facts.slice(-14, -7)

  // Load is driven by load_estimate, not the strictly-measured total_load: only
  // ~26% of sessions carry an RPE, so total_load alone reports most training
  // days as rest days. The estimate falls back to heart-rate zones, then to a
  // conservative assumed RPE.
  const loadSeries = facts.map((f) => ({
    day: f.day,
    load: num(f.load_estimate) ?? 0,
    sessionCount: num(f.session_count) ?? 0,
    sessionsWithIntensity: num(f.sessions_with_intensity) ?? 0,
  }))
  const loadMetrics = computeLoadMetrics(loadSeries)
  const latestMetrics = loadMetrics[loadMetrics.length - 1]

  // ACWR over a series that is mostly assumed values describes the assumptions,
  // not the training, so it is withheld rather than shown as a confident band.
  const coverage = intensityCoverage(loadSeries.slice(-CHRONIC_WINDOW_DAYS))
  const showAcwr = coverage.sufficient && latestMetrics?.acwr != null

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

  const weeklyLoad = sumOf(last7, "load_estimate")
  const prevWeeklyLoad = sumOf(prev7, "load_estimate")
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

  // A light week means the opposite thing depending on whether you were hurt,
  // so the heatmap marks injured days rather than letting a lay-off read as a
  // taper. An injury with no cleared_date is still open, hence the open end.
  const injuredOn = (day: string) =>
    (injuries ?? []).some(
      (injury) => day >= injury.injured_date && (injury.cleared_date == null || day <= injury.cleared_date)
    )

  const heatmapDays = facts.map((f) => ({
    day: f.day,
    value: num(f.load_estimate) ?? 0,
    marked: f.had_match === true,
    injured: injuredOn(f.day),
  }))

  // Which days of the last week were trained, not just how much in total - the
  // one thing the tiles cannot say. daily_facts generates a full calendar, so a
  // rest day is a real zero row and "didn't train" is distinguishable from
  // "no data", which is the whole point of the strip.
  const weekMaxLoad = Math.max(...last7.map((f) => num(f.load_estimate) ?? 0), 1)
  const weekDays = last7.map((f) => {
    const load = num(f.load_estimate) ?? 0
    const count = num(f.session_count) ?? 0
    return {
      date: f.day,
      level: (count === 0 ? 0 : load >= weekMaxLoad * 0.5 ? 2 : 1) as 0 | 1 | 2,
      title:
        count === 0
          ? `${f.day} - rest`
          : `${f.day} - ${count} session${count === 1 ? "" : "s"}, load ${Math.round(load)}`,
    }
  })
  // Rest days, not trained days. Google Health logs every detected walk as a
  // session, so "days with a session" is 7 most weeks and says nothing. Days
  // with *no* load is the number that varies - and against an ACWR that is
  // already ramping, it is the one worth seeing.
  const restDays = weekDays.filter((d) => d.level === 0).length

  // Sessions that still need an RPE, newest first - the one action that
  // actually improves the numbers above.
  const unratedRecent = (sessions ?? []).filter((s) => s.rpe == null && s.manual_rpe == null)

  return (
    <PageShell width="wide">
      <PageHeader title="Training Hub" description={`Signed in as ${user?.email ?? ""}`} />

      {logged && (
        <p className="rounded-md bg-secondary p-2 text-sm text-secondary-foreground">
          Saved your {logged} log.
        </p>
      )}

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

      {openInjuries.length > 0 && (
        <Link
          href="/injuries"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-status-critical/50 bg-status-critical/10 p-3 text-sm transition-colors hover:bg-status-critical/15"
        >
          <span className="font-medium text-status-critical">
            {openInjuries.length === 1 ? "Injury open" : `${openInjuries.length} injuries open`}
          </span>
          <span className="text-muted-foreground">
            {openInjuries
              .map(
                (injury) =>
                  `${injurySiteLabel(injury.type)}, day ${injuryDurationDays(injury.injured_date, null)}`
              )
              .join(" - ")}
          </span>
        </Link>
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

      <Card>
        <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <ProgressRing
            value={readinessScore ?? 0}
            max={100}
            label="Readiness"
            display={readinessScore != null ? String(readinessScore) : "-"}
            caption={readinessScore != null ? "of 100" : "not logged"}
            tone={
              readinessScore == null
                ? "brand"
                : readinessScore >= 70
                  ? "good"
                  : readinessScore >= 50
                    ? "warning"
                    : "critical"
            }
          />
          <WeekDotStrip
            days={weekDays}
            label={`Last 7 days - ${restDays === 0 ? "no rest days" : `${restDays} rest`}`}
            className="w-full min-w-0 flex-1"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          label="Readiness today"
          value={readinessScore != null ? `${readinessScore}` : "-"}
          hint={readinessScore != null ? "out of 100" : "not logged"}
          status={readinessScore != null ? readinessStatus(readinessScore) : "neutral"}
          href="/trends/readiness"
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
          value={showAcwr ? latestMetrics.acwr!.toFixed(2) : "-"}
          hint={
            showAcwr
              ? ACWR_BAND_LABEL[acwrBand(latestMetrics.acwr!)]
              : coverage.coverage != null && !coverage.sufficient
                ? `needs RPE on more sessions (${Math.round(coverage.coverage * 100)}% have it)`
                : "needs 28 days"
          }
          status={showAcwr ? acwrStatus(latestMetrics.acwr!) : "neutral"}
          href="/trends/load"
          sparkline={
            showAcwr
              ? loadMetrics
                  .slice(-28)
                  .map((m) => m.acwr)
                  .filter((v): v is number => v != null)
              : undefined
          }
        />

        <StatTile
          label="Load (7d)"
          value={Math.round(weeklyLoad).toString()}
          hint={
            coverage.sufficient && latestMetrics?.monotony != null
              ? `monotony ${latestMetrics.monotony.toFixed(2)}`
              : "partly estimated"
          }
          href="/trends/load"
          delta={
            percentChange(weeklyLoad, prevWeeklyLoad) && {
              ...percentChange(weeklyLoad, prevWeeklyLoad)!,
              goodDirection: "none",
              periodLabel: "vs prev 7d",
            }
          }
          sparkline={facts.slice(-28).map((f) => num(f.load_estimate) ?? 0)}
        />

        <StatTile
          label="Sleep (7d avg)"
          value={avgSleep != null ? `${avgSleep.toFixed(1)} h` : "-"}
          href="/trends/body"
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
          href="/trends/body"
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
          href="/trends/body"
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

      {unratedRecent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rate recent sessions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              {coverage.coverage != null
                ? `Only ${Math.round(coverage.coverage * 100)}% of the last 28 days' sessions have a real intensity reading, so load is partly estimated.`
                : "Load is partly estimated."}{" "}
              Rating these makes the numbers above real.
            </p>
            {unratedRecent.slice(0, 4).map((s) => (
              <div key={s.id} className="flex flex-col gap-1.5 border-t pt-3 first:border-t-0 first:pt-0">
                <Link href={`/sessions/${s.id}`} className="text-sm font-medium hover:underline">
                  {s.cardio_sessions?.focus ?? s.strength_sessions?.focus ?? sessionTypeLabel(s.type)}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {new Date(s.start_time).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </Link>
                <RpeQuickSet sessionId={s.id} currentRpe={null} syncedRpe={s.rpe} compact />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
    </PageShell>
  )
}
