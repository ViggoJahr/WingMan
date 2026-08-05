import Link from "next/link"
import { Gauge, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { isoDaysAgo } from "@/lib/dates"
import { BASELINE_WINDOW_DAYS, readMetric } from "@/lib/services/metricBaseline"
import { fetchDaysFor, parseRange, rangeDays } from "@/lib/timeRange"
import { TrendChart } from "@/components/charts/TrendChart"
import { ChartCard, ChartEmpty } from "@/components/metrics/ChartCard"
import { MetricHero } from "@/components/metrics/MetricHero"

export default async function ReadinessTrendPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const range = parseRange((await searchParams).range)
  const displayDays = rangeDays(range)

  const supabase = await createClient()

  const { data: entries } = await supabase
    .from("readiness")
    .select("date, total_score")
    .gte("date", isoDaysAgo(fetchDaysFor(range, BASELINE_WINDOW_DAYS)))
    .order("date", { ascending: true })

  const all = (entries ?? []).map((e) => ({ date: e.date, value: e.total_score ?? 0 }))
  const points = all.slice(-displayDays)
  const latest = all.at(-1)

  // The band comes from the full fetched history, not from the displayed
  // window: comparing today against a 30-day average that already contains
  // today flattens every verdict toward "normal".
  const reading = readMetric(
    all.slice(-BASELINE_WINDOW_DAYS).map((p) => p.value),
    "up"
  )

  const recentCheckins = [...all].reverse().slice(0, 14)

  return (
    <>
      <ChartCard
        action={
          <Link
            href="/log/readiness"
            className="flex items-center gap-1 rounded-full bg-brand-muted px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand/25"
          >
            <Plus className="size-3.5" aria-hidden />
            Check in
          </Link>
        }
        hero={
          <MetricHero
            icon={Gauge}
            label="Readiness"
            reading={reading}
            format={(v) => String(Math.round(v))}
            unit="/ 100"
            caption={latest ? `as of ${latest.date}` : undefined}
          />
        }
        footnote="The band is your own trailing average plus or minus one standard deviation, not a target. A score that is normal for you is the point of comparison here."
      >
        {points.length > 0 ? (
          <TrendChart
            data={points}
            kind="line"
            color="chart-1"
            format={{ suffix: "/100" }}
            yDomain={[0, 100]}
            band={
              reading.baseline
                ? { low: reading.baseline.low, high: reading.baseline.high }
                : null
            }
            height={280}
          />
        ) : (
          <ChartEmpty>
            No readiness check-ins yet -{" "}
            <Link href="/log/readiness" className="ml-1 underline">
              log your first one
            </Link>
            .
          </ChartEmpty>
        )}
      </ChartCard>

      {recentCheckins.length > 0 && (
        <ChartCard title="Recent check-ins">
          <ul className="flex flex-col divide-y text-sm">
            {recentCheckins.map((c) => (
              <li key={c.date} className="flex items-center justify-between py-2.5">
                <span className="text-muted-foreground">{c.date}</span>
                <div className="flex items-center gap-4">
                  <span className="font-heading font-semibold tabular-nums">{c.value}/100</span>
                  <Link
                    href={`/log/readiness?date=${c.date}`}
                    className="text-muted-foreground underline hover:text-foreground"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>
      )}
    </>
  )
}
