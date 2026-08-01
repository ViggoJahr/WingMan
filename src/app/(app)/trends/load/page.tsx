import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { fetchDailyFacts, factNumber } from "@/lib/services/dailyFacts"
import { aggregateWeeklyLoad } from "@/lib/services/trainingLoad"
import { CHRONIC_DAYS, intensityCoverage } from "@/lib/services/loadMetrics"
import { TrendChart } from "@/components/charts/TrendChart"

const DISPLAY_DAYS = 90

export default async function TrainingLoadPage() {
  const supabase = await createClient()

  const facts = await fetchDailyFacts(supabase, { days: DISPLAY_DAYS })

  // load_estimate, not total_load: only a minority of sessions carry a real
  // RPE, and the strictly-measured number reports the rest as rest days. The
  // coverage line below is what keeps that honest.
  const loadSeries = facts.map((f) => ({
    day: f.day,
    load: factNumber(f.load_estimate) ?? 0,
    sessionCount: factNumber(f.session_count) ?? 0,
    sessionsWithIntensity: factNumber(f.sessions_with_intensity) ?? 0,
  }))

  const weeklyLoad = aggregateWeeklyLoad(loadSeries).map((week) => ({
    date: week.weekStart,
    value: week.load,
  }))
  const coverage = intensityCoverage(loadSeries.slice(-CHRONIC_DAYS))
  const coveragePercent = Math.round((coverage.coverage ?? 0) * 100)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Weekly load</CardTitle>
        </CardHeader>
        <CardContent>
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
            <p className="text-sm text-muted-foreground">
              No sessions yet - run a sync or log a session to see this chart.
            </p>
          )}

          {coverage.coverage != null &&
            (coverage.sufficient ? (
              // Phrased without a possessive: an &apos; entity directly after a
              // word swallowed the following space in the rendered output
              // ("last 28days"), and the plain wording reads better regardless.
              <p className="mt-3 text-xs text-muted-foreground">
                {coveragePercent}% of sessions in the last {CHRONIC_DAYS} days carry a real
                intensity reading.
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Only {coveragePercent}% of sessions in the last {CHRONIC_DAYS} days carry a real
                intensity reading, so the rest is estimated from heart-rate zones or duration
                alone. Acute:chronic ratio and monotony stay hidden until that passes 50% -{" "}
                <Link href="/" className="underline">
                  rate recent sessions
                </Link>{" "}
                to fix it.
              </p>
            ))}
        </CardContent>
      </Card>
    </>
  )
}
