import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { fetchDailyFacts, factNumber } from "@/lib/services/dailyFacts"
import { aggregateWeeklyLoad } from "@/lib/services/trainingLoad"
import {
  ACWR_BAND_LABEL,
  CHRONIC_DAYS,
  acwrBand,
  computeLoadMetrics,
  intensityCoverage,
} from "@/lib/services/loadMetrics"
import { fetchDaysFor, parseRange, rangeDays, rangeLabel } from "@/lib/timeRange"
import { TrendChart } from "@/components/charts/TrendChart"
import { ChartCard, ChartEmpty } from "@/components/metrics/ChartCard"
import { StatTile } from "@/components/StatTile"

/**
 * Chronic load needs 28 days of history before the first point it can label, so
 * the query always reaches back a full chronic window further than the chart
 * draws. Without it, switching to 30D would show an ACWR series that starts
 * blank for its first four weeks.
 */
const LOOKBACK_DAYS = CHRONIC_DAYS

export default async function TrainingLoadPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const range = parseRange((await searchParams).range)
  const displayDays = rangeDays(range)

  const supabase = await createClient()
  const facts = await fetchDailyFacts(supabase, { days: fetchDaysFor(range, LOOKBACK_DAYS) })

  // load_estimate, not total_load: only a minority of sessions carry a real
  // RPE, and the strictly-measured number reports the rest as rest days. The
  // coverage line below is what keeps that honest.
  const loadSeries = facts.map((f) => ({
    day: f.day,
    load: factNumber(f.load_estimate) ?? 0,
    sessionCount: factNumber(f.session_count) ?? 0,
    sessionsWithIntensity: factNumber(f.sessions_with_intensity) ?? 0,
  }))

  const metrics = computeLoadMetrics(loadSeries)
  const shown = metrics.slice(-displayDays)
  const latest = metrics.at(-1)

  const weeklyLoad = aggregateWeeklyLoad(loadSeries.slice(-displayDays)).map((week) => ({
    date: week.weekStart,
    value: week.load,
  }))

  const acwrPoints = shown
    .filter((m) => m.acwr != null)
    .map((m) => ({ date: m.day, value: m.acwr! }))

  const dailyLoad = shown.map((m) => ({ date: m.day, value: m.load }))

  const coverage = intensityCoverage(loadSeries.slice(-CHRONIC_DAYS))
  const coveragePercent = Math.round((coverage.coverage ?? 0) * 100)
  const showDerived = coverage.sufficient

  const acwr = showDerived ? (latest?.acwr ?? null) : null
  const monotony = showDerived ? (latest?.monotony ?? null) : null
  const strain = showDerived ? (latest?.strain ?? null) : null

  const coverageNote = coverage.coverage == null ? null : showDerived ? (
    // Phrased without a possessive: an &apos; entity directly after a word
    // swallowed the following space in the rendered output ("last 28days"), and
    // the plain wording reads better regardless.
    <>
      {coveragePercent}% of sessions in the last {CHRONIC_DAYS} days carry a real intensity
      reading.
    </>
  ) : (
    <>
      Only {coveragePercent}% of sessions in the last {CHRONIC_DAYS} days carry a real intensity
      reading, so the rest is estimated from heart-rate zones or duration alone. Acute:chronic
      ratio and monotony stay hidden until that passes 50% -{" "}
      <Link href="/" className="underline">
        rate recent sessions
      </Link>{" "}
      to fix it.
    </>
  )

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <StatTile
          label="Acute:chronic"
          value={acwr != null ? acwr.toFixed(2) : "-"}
          hint={acwr != null ? ACWR_BAND_LABEL[acwrBand(acwr)] : "needs more RPE"}
          status={
            acwr == null
              ? "neutral"
              : acwrBand(acwr) === "optimal"
                ? "good"
                : acwrBand(acwr) === "high"
                  ? "critical"
                  : "warning"
          }
          sparkline={shown.map((m) => m.acwr)}
        />
        <StatTile
          label="Monotony"
          value={monotony != null ? monotony.toFixed(2) : "-"}
          hint={monotony != null ? "7d load / its spread" : "needs more RPE"}
          sparkline={shown.map((m) => m.monotony)}
        />
        <StatTile
          label="Strain"
          value={strain != null ? Math.round(strain).toLocaleString() : "-"}
          hint={strain != null ? "weekly load x monotony" : "needs more RPE"}
          sparkline={shown.map((m) => m.strain)}
        />
      </div>

      <ChartCard title={`Weekly load - last ${rangeLabel(range)}`} footnote={coverageNote}>
        {weeklyLoad.length > 0 ? (
          <TrendChart
            data={weeklyLoad}
            kind="bar"
            color="chart-1"
            format={{ decimals: 0, suffix: " load" }}
            labelPrefix="Week of "
            height={280}
          />
        ) : (
          <ChartEmpty>
            No sessions yet - run a sync or log a session to see this chart.
          </ChartEmpty>
        )}
      </ChartCard>

      <ChartCard
        title="Daily load"
        footnote="Rest days are real zeros, not gaps - daily_facts generates a full calendar, so a flat stretch here means no training rather than no data."
      >
        {dailyLoad.length > 0 ? (
          <TrendChart
            data={dailyLoad}
            kind="bar"
            color="chart-1"
            format={{ decimals: 0, suffix: " load" }}
            height={200}
          />
        ) : (
          <ChartEmpty>Nothing logged in this window.</ChartEmpty>
        )}
      </ChartCard>

      {showDerived && acwrPoints.length > 0 && (
        <ChartCard
          title="Acute:chronic ratio"
          footnote="The shaded band is the commonly cited 0.8-1.3 sweet spot. Treat it as a rough guide rather than a law - these are population-level findings and the underlying research is contested."
        >
          <TrendChart
            data={acwrPoints}
            kind="line"
            color="chart-1"
            format={{ decimals: 2 }}
            band={{ low: 0.8, high: 1.3 }}
            height={220}
          />
        </ChartCard>
      )}
    </>
  )
}
