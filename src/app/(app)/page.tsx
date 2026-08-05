import Link from "next/link"
import {
  Activity,
  Bed,
  CircleAlert,
  Droplet,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  Plus,
  Scale,
  Sparkles,
  TrendingUp,
  Waves,
} from "lucide-react"
import { PageHeader, PageShell } from "@/components/PageShell"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import {
  READINESS_DIMENSIONS,
  WARNING_THRESHOLD,
  describeValue,
} from "@/lib/services/readinessDimensions"
import {
  factNumber as num,
  factSeries,
  fetchDailyFacts,
  type DailyFactRow,
} from "@/lib/services/dailyFacts"
import { sessionTypeLabel } from "@/lib/labels"
import { isoDaysAgo, todayIso } from "@/lib/dates"
import { injuryDurationDays, injurySiteLabel } from "@/lib/injuries"
import {
  ACWR_BAND_LABEL,
  acwrBand,
  computeLoadMetrics,
  intensityCoverage,
} from "@/lib/services/loadMetrics"
import {
  BASELINE_WINDOW_DAYS,
  readMetric,
  type GoodDirection,
  type MetricReading,
} from "@/lib/services/metricBaseline"
import { buildInsights, countShortNightStreak } from "@/lib/services/insights"
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap"
import { ProgressRing, RingGroup } from "@/components/charts/ProgressRing"
import { WeekDotStrip } from "@/components/charts/WeekDotStrip"
import { SectionHeading } from "@/components/metrics/SectionHeading"
import { InsightCard } from "@/components/metrics/InsightCard"
import { HealthTile, HealthTileGrid } from "@/components/metrics/HealthTile"
import { MetricList, MetricRow } from "@/components/metrics/MetricRow"
import { SessionList, type SessionRowData } from "@/components/SessionRow"
import { RpeQuickSet } from "@/components/RpeQuickSet"

// The heatmap shows recent calendar months; ACWR needs 28 days of history
// before that, and the metric bands need BASELINE_WINDOW_DAYS, so pull a little
// over 200 days in one query and slice it locally.
const HISTORY_DAYS = 210
const HEATMAP_MONTHS = 2
const CHRONIC_WINDOW_DAYS = 28

/** How much history each sparkline draws. Long enough to show a shape, short
 *  enough that a 120px trace is not a solid block. */
const SPARK_DAYS = 30

/**
 * The sleep ring needs a target to be a ring at all. Eight hours is the common
 * adult recommendation rather than anything this app has measured, which is why
 * the *verdict* under every sleep figure comes from the athlete's own baseline
 * instead - the ring is a target, the band is the truth.
 */
const SLEEP_TARGET_HOURS = 8

/**
 * The load ring is ACWR as a percentage of chronic base, and 150% is where the
 * "spike" band starts. Filling the ring therefore means "you are at the top of
 * the sensible range", not "you have completed something".
 */
const LOAD_RING_MAX = 150

function sumOf(rows: DailyFactRow[], key: keyof DailyFactRow): number {
  return rows.reduce((acc, row) => acc + (num(row[key] as number | null) ?? 0), 0)
}

function ringTone(score: number): "good" | "warning" | "critical" {
  if (score >= 70) return "good"
  if (score >= 50) return "warning"
  return "critical"
}

function acwrTone(acwr: number): "good" | "warning" | "critical" {
  const band = acwrBand(acwr)
  if (band === "optimal") return "good"
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

  /**
   * One column, read two ways: a long window for the band and a short one for
   * the trace. They have to come from the same array or the verdict under a
   * figure could disagree with the sparkline beside it.
   */
  function metric(key: keyof DailyFactRow, goodDirection: GoodDirection) {
    const values = factSeries(facts, key)
    return {
      reading: readMetric(values.slice(-BASELINE_WINDOW_DAYS), goodDirection),
      series: values.slice(-SPARK_DAYS),
      full: values,
    }
  }

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
  const acwr = showAcwr ? latestMetrics.acwr! : null

  const todaysFact = facts.find((f) => f.day === today)
  const latestReadinessFact = [...facts].reverse().find((f) => f.readiness_score != null)

  const injuryDim = READINESS_DIMENSIONS.find((d) => d.field === "current_injury")!
  const illnessDim = READINESS_DIMENSIONS.find((d) => d.field === "current_illness")!
  const healthWarnings = latestReadinessFact
    ? [
        (num(latestReadinessFact.current_injury) ?? 0) >= WARNING_THRESHOLD
          ? {
              label: "Injury",
              description: describeValue(injuryDim, num(latestReadinessFact.current_injury)!),
            }
          : null,
        (num(latestReadinessFact.current_illness) ?? 0) >= WARNING_THRESHOLD
          ? {
              label: "Illness",
              description: describeValue(illnessDim, num(latestReadinessFact.current_illness)!),
            }
          : null,
      ].filter((w): w is { label: string; description: string } => w != null)
    : []

  const readiness = metric("readiness_score", "up")
  const sleep = metric("sleep_hours", "up")
  const steps = metric("steps", "up")
  const restingHr = metric("resting_heart_rate", "down")
  const hrv = metric("avg_hrv_ms", "up")
  const spo2 = metric("avg_spo2_percentage", "up")
  const weight = metric("weight_kg", "none")
  const calories = metric("calories_kcal", "none")

  const weeklyLoad = sumOf(last7, "load_estimate")

  // Load has no "normal range" in the baseline sense - a rest day is a real
  // zero, not a low reading - so its row carries the trace without a band and
  // takes its verdict from ACWR instead.
  const loadSpark = facts.slice(-SPARK_DAYS).map((f) => num(f.load_estimate) ?? 0)
  const loadReading: MetricReading = {
    latest: weeklyLoad,
    baseline: null,
    deviation: null,
    tone: acwr != null ? acwrTone(acwr) : "neutral",
    label: null,
  }

  const readinessScore = num(todaysFact?.readiness_score)

  // A light week means the opposite thing depending on whether you were hurt,
  // so the heatmap marks injured days rather than letting a lay-off read as a
  // taper. An injury with no cleared_date is still open, hence the open end.
  const injuredOn = (day: string) =>
    (injuries ?? []).some(
      (injury) =>
        day >= injury.injured_date && (injury.cleared_date == null || day <= injury.cleared_date)
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

  const insights = buildInsights({
    acwr,
    weeklyLoad,
    restDays,
    readiness: { value: readiness.reading.latest, deviation: readiness.reading.deviation },
    sleep: { value: sleep.reading.latest, deviation: sleep.reading.deviation },
    shortNightStreak: sleep.reading.baseline
      ? countShortNightStreak(sleep.full, sleep.reading.baseline.low)
      : 0,
  })

  // Sessions that still need an RPE, newest first - the one action that
  // actually improves the numbers above.
  const unratedRecent = (sessions ?? []).filter((s) => s.rpe == null && s.manual_rpe == null)

  const sessionRows = (sessions ?? []).map((s) => ({
    ...s,
    cardio_sessions: s.cardio_sessions as unknown as SessionRowData["cardio_sessions"],
    strength_sessions: s.strength_sessions as unknown as SessionRowData["strength_sessions"],
  }))

  const sleepHours = sleep.reading.latest

  return (
    <PageShell width="wide">
      <PageHeader
        title={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        description={user?.email ?? undefined}
      />

      {logged && (
        <p className="rounded-xl bg-status-good-soft p-3 text-sm text-status-good">
          Saved your {logged} log.
        </p>
      )}

      {healthWarnings.length > 0 && (
        <div className="rounded-xl bg-status-critical-soft p-3.5 text-sm ring-1 ring-status-critical/30">
          <p className="flex items-center gap-1.5 font-medium text-status-critical">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            Consider adjusting training
            {latestReadinessFact &&
              latestReadinessFact.day !== today &&
              ` (from ${latestReadinessFact.day})`}
          </p>
          <ul className="mt-1.5 list-disc pl-5 text-foreground">
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
          className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-status-critical-soft p-3.5 text-sm ring-1 ring-status-critical/30 transition-colors hover:bg-status-critical/20"
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

      {/* The reference's three-ring header, mapped onto what this app measures:
          how ready you are, how hard the week has been relative to your base,
          and last night. */}
      <RingGroup>
        <ProgressRing
          value={readinessScore ?? 0}
          max={100}
          label="Readiness"
          display={readinessScore != null ? String(readinessScore) : "-"}
          caption={readinessScore != null ? "of 100" : "not logged"}
          tone={readinessScore == null ? "neutral" : ringTone(readinessScore)}
        />
        <ProgressRing
          value={acwr != null ? acwr * 100 : 0}
          max={LOAD_RING_MAX}
          label="Load"
          display={acwr != null ? acwr.toFixed(2) : "-"}
          caption={acwr != null ? ACWR_BAND_LABEL[acwrBand(acwr)] : "needs RPE"}
          tone={acwr != null ? acwrTone(acwr) : "neutral"}
        />
        <ProgressRing
          value={sleepHours ?? 0}
          max={SLEEP_TARGET_HOURS}
          label="Sleep"
          display={sleepHours != null ? `${sleepHours.toFixed(1)}h` : "-"}
          caption={sleepHours != null ? `of ${SLEEP_TARGET_HOURS}h` : "no data"}
          tone={sleep.reading.deviation ? sleep.reading.tone : "neutral"}
        />
      </RingGroup>

      {insights.map((insight) => (
        <InsightCard
          key={insight.key}
          icon={
            insight.tone === "good"
              ? Sparkles
              : insight.tone === "brand"
                ? TrendingUp
                : CircleAlert
          }
          tone={insight.tone}
          headline={insight.headline}
          body={insight.body}
          href={insight.href}
          hrefLabel={insight.hrefLabel}
        />
      ))}

      {!todaysFact?.readiness_score && (
        <Link
          href="/log/readiness"
          className="flex items-center gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-brand/30 transition-colors hover:bg-accent"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
            <Gauge className="size-4" aria-hidden />
          </span>
          <span>
            <span className="font-medium">You haven&apos;t logged readiness today.</span>{" "}
            <span className="text-muted-foreground">Tap to check in.</span>
          </span>
        </Link>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { href: "/log/practice", label: "Practice" },
          { href: "/log/match", label: "Match" },
          { href: "/log/workout", label: "Workout" },
          { href: "/log/readiness", label: "Readiness" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              "flex items-center gap-1 rounded-full bg-card px-3.5 py-2 text-sm font-medium",
              "ring-1 ring-foreground/10 transition-colors hover:bg-accent hover:text-brand"
            )}
          >
            <Plus className="size-3.5" aria-hidden />
            {action.label}
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeading href="/trends/load">This week</SectionHeading>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <WeekDotStrip
            days={weekDays}
            label={`${restDays === 0 ? "No rest days" : `${restDays} rest ${restDays === 1 ? "day" : "days"}`} - load ${Math.round(weeklyLoad)}`}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading href="/trends/readiness">Trends</SectionHeading>
        <MetricList>
          <MetricRow
            icon={Gauge}
            label="Readiness"
            reading={readiness.reading}
            series={readiness.series}
            format={(v) => String(Math.round(v))}
            unit="/ 100"
            href="/trends/readiness"
          />
          <MetricRow
            icon={Activity}
            label="Training load (7d)"
            reading={loadReading}
            series={loadSpark}
            format={(v) => String(Math.round(v))}
            unit="units"
            note={
              acwr != null
                ? `${ACWR_BAND_LABEL[acwrBand(acwr)]} - ACWR ${acwr.toFixed(2)}`
                : "Partly estimated - needs RPE on more sessions"
            }
            href="/trends/load"
          />
          <MetricRow
            icon={Bed}
            label="Sleep"
            reading={sleep.reading}
            series={sleep.series}
            format={(v) => `${v.toFixed(1)}`}
            unit="hours"
            href="/trends/body"
          />
        </MetricList>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading href="/trends/body">Health monitor</SectionHeading>
        <HealthTileGrid>
          <HealthTile
            icon={HeartPulse}
            label="Resting HR"
            reading={restingHr.reading}
            format={(v) => String(Math.round(v))}
            unit="bpm"
            href="/trends/body"
          />
          <HealthTile
            icon={Waves}
            label="HRV"
            reading={hrv.reading}
            format={(v) => v.toFixed(1)}
            unit="ms"
            href="/trends/body"
          />
          <HealthTile
            icon={Droplet}
            label="SpO2"
            reading={spo2.reading}
            format={(v) => v.toFixed(1)}
            unit="%"
            href="/trends/body"
          />
          <HealthTile
            icon={Footprints}
            label="Steps"
            reading={steps.reading}
            format={(v) => Math.round(v).toLocaleString()}
            href="/trends/body"
          />
          <HealthTile
            icon={Flame}
            label="Energy"
            reading={calories.reading}
            format={(v) => Math.round(v).toLocaleString()}
            unit="kcal"
            href="/trends/body"
          />
          <HealthTile
            icon={Scale}
            label="Weight"
            reading={weight.reading}
            format={(v) => v.toFixed(1)}
            unit="kg"
            href="/trends/body"
          />
        </HealthTileGrid>
      </section>

      {unratedRecent.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionHeading>Rate recent sessions</SectionHeading>
          <div className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-xs text-muted-foreground">
              {coverage.coverage != null
                ? `Only ${Math.round(coverage.coverage * 100)}% of the last 28 days' sessions have a real intensity reading, so load is partly estimated.`
                : "Load is partly estimated."}{" "}
              Rating these makes the numbers above real.
            </p>
            {unratedRecent.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-1.5 border-t pt-3 first:border-t-0 first:pt-0"
              >
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
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeading href="/history">Activity</SectionHeading>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <ActivityHeatmap
            days={heatmapDays}
            months={HEATMAP_MONTHS}
            metricLabel="training load"
            valueFormat={{ decimals: 0, prefix: "load " }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading href="/history">Recent activity</SectionHeading>
        <SessionList sessions={sessionRows} />
      </section>
    </PageShell>
  )
}
