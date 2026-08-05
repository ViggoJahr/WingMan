import { Dumbbell, Timer } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { TrendChart } from "@/components/charts/TrendChart"
import { PageHeader, PageShell } from "@/components/PageShell"
import { ChartCard, ChartEmpty } from "@/components/metrics/ChartCard"
import { MetricHero } from "@/components/metrics/MetricHero"
import { BASELINE_WINDOW_DAYS, readMetric } from "@/lib/services/metricBaseline"

function formatTestType(testType: string) {
  return testType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default async function TestsPage() {
  const supabase = await createClient()

  const [{ data: strengthRows }, { data: masRows }] = await Promise.all([
    supabase
      .from("strength_test_results")
      .select("test_type, weight, reps, estimated_1rm, test_date")
      .order("test_date", { ascending: true }),
    supabase.from("mas_tests").select("test_date, mas_mps").order("test_date", { ascending: true }),
  ])

  const byType = new Map<string, NonNullable<typeof strengthRows>>()
  for (const row of strengthRows ?? []) {
    if (!byType.has(row.test_type)) byType.set(row.test_type, [])
    byType.get(row.test_type)!.push(row)
  }

  const masPoints = (masRows ?? [])
    .filter((r) => r.mas_mps != null)
    .map((r) => ({ date: r.test_date, value: r.mas_mps! }))

  // Tests are sparse - a handful of results a year - so a "normal range" built
  // from them would be a band across two data points. `readMetric` withholds it
  // below its sample floor, which is exactly the right behaviour here: the hero
  // shows the latest figure with no verdict, and the chart carries the trend.
  const masReading = readMetric(
    masPoints.slice(-BASELINE_WINDOW_DAYS).map((p) => p.value),
    "up"
  )

  return (
    <PageShell>
      <PageHeader
        title="Tests"
        description="Strength and aerobic-speed test results, synced from TUGG."
      />

      {Array.from(byType.entries()).map(([testType, rows]) => {
        const hasOneRm = rows.some((r) => r.estimated_1rm != null)
        const points = hasOneRm
          ? rows
              .filter((r) => r.estimated_1rm != null)
              .map((r) => ({ date: r.test_date, value: r.estimated_1rm! }))
          : rows.filter((r) => r.reps != null).map((r) => ({ date: r.test_date, value: r.reps! }))
        const unit = hasOneRm ? "kg est. 1RM" : "reps"
        const reading = readMetric(
          points.slice(-BASELINE_WINDOW_DAYS).map((p) => p.value),
          "up"
        )

        return (
          <ChartCard
            key={testType}
            hero={
              <MetricHero
                icon={Dumbbell}
                label={formatTestType(testType)}
                reading={reading}
                format={(v) => String(v)}
                unit={unit}
                caption={points.at(-1) ? `tested ${points.at(-1)!.date}` : undefined}
              />
            }
          >
            {/* A line needs two points to be a line. Tests are sparse enough
                that most have exactly one result, which previously drew 250px
                of empty grid with a single dot floating in it and read as a
                broken chart rather than as a first data point. */}
            {points.length > 1 ? (
              <TrendChart data={points} kind="line" color="chart-1" format={{ suffix: ` ${unit}` }} />
            ) : (
              <ChartEmpty>
                {points.length === 1
                  ? "Only one result so far - test again to see a trend."
                  : "No usable data points for this test."}
              </ChartEmpty>
            )}
          </ChartCard>
        )
      })}

      <ChartCard
        hero={
          <MetricHero
            icon={Timer}
            label="MAS (aerobic speed)"
            reading={masReading}
            format={(v) => v.toFixed(2)}
            unit="m/s"
            caption={masPoints.at(-1) ? `tested ${masPoints.at(-1)!.date}` : undefined}
          />
        }
      >
        {masPoints.length > 1 ? (
          <TrendChart
            data={masPoints}
            kind="line"
            color="chart-1"
            format={{ decimals: 2, suffix: " m/s" }}
          />
        ) : (
          <ChartEmpty>
            {masPoints.length === 1
              ? "Only one result so far - test again to see a trend."
              : "No MAS test data synced yet."}
          </ChartEmpty>
        )}
      </ChartCard>

      {byType.size === 0 && masPoints.length === 0 && (
        <p className="text-sm text-muted-foreground">No test results synced yet.</p>
      )}
    </PageShell>
  )
}
