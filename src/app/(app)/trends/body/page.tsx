import { Bed, Droplet, Flame, Footprints, HeartPulse, Moon, Scale, Waves } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { isoDaysAgo, timestampDaysAgo } from "@/lib/dates"
import { TrendChart, type TrendPoint } from "@/components/charts/TrendChart"
import { StackedBar } from "@/components/charts/StackedBar"
import { ChartCard, ChartEmpty } from "@/components/metrics/ChartCard"
import { MetricHero } from "@/components/metrics/MetricHero"
import { SectionHeading } from "@/components/metrics/SectionHeading"
import {
  BASELINE_WINDOW_DAYS,
  readMetric,
  type GoodDirection,
} from "@/lib/services/metricBaseline"
import { fetchDaysFor, parseRange, rangeDays } from "@/lib/timeRange"
import {
  SLEEP_STAGES,
  SLEEP_STAGE_FILL,
  SLEEP_STAGE_LABELS,
  formatMinutes,
  hasStageDetail,
  summariseSleepStages,
} from "@/lib/services/sleepStages"

function toPoints(rows: Array<{ date: string; value: number | null }>): TrendPoint[] {
  return rows.filter((r) => r.value != null).map((r) => ({ date: r.date, value: r.value! }))
}

export default async function BodyTrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const range = parseRange((await searchParams).range)
  // Every series is fetched a full baseline window deeper than it is drawn, so
  // the band a value is judged against is not built from the same thirty days
  // the chart is showing.
  const fetchDays = fetchDaysFor(range, BASELINE_WINDOW_DAYS)
  const displayFrom = isoDaysAgo(rangeDays(range))

  const supabase = await createClient()

  const [{ data: weightRows }, { data: dailyRows }, { data: sleepRows }] = await Promise.all([
    supabase
      .from("body_metrics")
      .select("date, weight_kg, body_fat_percentage")
      .gte("date", isoDaysAgo(fetchDays))
      .order("date", { ascending: true }),
    supabase
      .from("daily_metrics")
      .select("date, steps, resting_heart_rate, avg_hrv_ms, avg_spo2_percentage, active_zone_minutes")
      .gte("date", isoDaysAgo(fetchDays))
      .order("date", { ascending: true }),
    supabase
      .from("sleep_logs")
      .select("start_time, duration_minutes, sleep_stages")
      .not("duration_minutes", "is", null)
      .gte("start_time", timestampDaysAgo(fetchDays))
      .order("start_time", { ascending: true }),
  ])

  /**
   * One series, read two ways: the whole fetched history builds the band, and
   * only the requested window is drawn. Returning both from one place is what
   * keeps the verdict in a card's header consistent with the band shaded behind
   * its chart.
   */
  function series(points: TrendPoint[], goodDirection: GoodDirection) {
    const reading = readMetric(
      points.slice(-BASELINE_WINDOW_DAYS).map((p) => p.value),
      goodDirection
    )
    return {
      reading,
      points: points.filter((p) => p.date >= displayFrom),
      band: reading.baseline
        ? { low: reading.baseline.low, high: reading.baseline.high }
        : null,
    }
  }

  const weight = series(
    toPoints((weightRows ?? []).map((r) => ({ date: r.date, value: r.weight_kg }))),
    "none"
  )
  // Synced from the scale on every weigh-in and never once charted.
  const bodyFat = series(
    toPoints((weightRows ?? []).map((r) => ({ date: r.date, value: r.body_fat_percentage }))),
    "none"
  )
  const steps = series(
    toPoints((dailyRows ?? []).map((r) => ({ date: r.date, value: r.steps }))),
    "up"
  )
  const restingHr = series(
    toPoints((dailyRows ?? []).map((r) => ({ date: r.date, value: r.resting_heart_rate }))),
    "down"
  )
  const hrv = series(
    toPoints((dailyRows ?? []).map((r) => ({ date: r.date, value: r.avg_hrv_ms }))),
    "up"
  )
  const spo2 = series(
    toPoints((dailyRows ?? []).map((r) => ({ date: r.date, value: r.avg_spo2_percentage }))),
    "up"
  )
  const azm = series(
    toPoints((dailyRows ?? []).map((r) => ({ date: r.date, value: r.active_zone_minutes }))),
    "up"
  )

  const sleep = series(
    (sleepRows ?? [])
      .filter((r) => r.duration_minutes != null)
      .map((r) => ({
        date: r.start_time.slice(0, 10),
        value: Math.round((r.duration_minutes! / 60) * 10) / 10,
      })),
    "up"
  )

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

  const BAND_NOTE =
    "The shaded band is your own trailing average plus or minus one standard deviation over the last " +
    `${BASELINE_WINDOW_DAYS} days - not a population norm, and not a target.`

  return (
    <>
      <SectionHeading>Recovery</SectionHeading>

      <ChartCard
        hero={
          <MetricHero
            icon={HeartPulse}
            label="Resting heart rate"
            reading={restingHr.reading}
            format={(v) => String(Math.round(v))}
            unit="bpm"
          />
        }
        footnote={BAND_NOTE}
      >
        {restingHr.points.length > 0 ? (
          <TrendChart
            data={restingHr.points}
            kind="line"
            color="chart-1"
            format={{ decimals: 0, suffix: " bpm" }}
            band={restingHr.band}
          />
        ) : (
          <ChartEmpty>No resting heart rate data synced yet.</ChartEmpty>
        )}
      </ChartCard>

      <ChartCard
        hero={
          <MetricHero
            icon={Waves}
            label="Heart rate variability"
            reading={hrv.reading}
            format={(v) => v.toFixed(1)}
            unit="ms"
          />
        }
        footnote={BAND_NOTE}
      >
        {hrv.points.length > 0 ? (
          <TrendChart
            data={hrv.points}
            kind="line"
            color="chart-1"
            format={{ decimals: 1, suffix: " ms" }}
            band={hrv.band}
          />
        ) : (
          <ChartEmpty>No HRV data synced yet.</ChartEmpty>
        )}
      </ChartCard>

      <ChartCard
        hero={
          <MetricHero
            icon={Droplet}
            label="Blood oxygen"
            reading={spo2.reading}
            format={(v) => v.toFixed(1)}
            unit="%"
          />
        }
        footnote={
          spo2.points.length > 0
            ? "Daily median of readings between 70-100%, since the sensor emits a literal 50% when it can't get a reading. Days with too few valid samples are omitted entirely. Wrist-based SpO2 is still an estimate - treat single-day dips as sensor noise unless they persist."
            : undefined
        }
      >
        {spo2.points.length > 0 ? (
          <TrendChart
            data={spo2.points}
            kind="line"
            color="chart-1"
            format={{ decimals: 1, suffix: "%" }}
            yDomain={[85, 100]}
            band={spo2.band}
          />
        ) : (
          <ChartEmpty>No SpO2 data synced yet.</ChartEmpty>
        )}
      </ChartCard>

      <SectionHeading>Sleep</SectionHeading>

      <ChartCard
        hero={
          <MetricHero
            icon={Bed}
            label="Time asleep"
            reading={sleep.reading}
            format={(v) => `${v.toFixed(1)}`}
            unit="hours"
          />
        }
        footnote={BAND_NOTE}
      >
        {sleep.points.length > 0 ? (
          <TrendChart
            data={sleep.points}
            kind="bar"
            color="chart-1"
            format={{ decimals: 1, suffix: "h" }}
            band={sleep.band}
          />
        ) : (
          <ChartEmpty>No sleep data synced yet.</ChartEmpty>
        )}
      </ChartCard>

      {latestStagedSleep && (
        <ChartCard
          title={
            <>
              <Moon className="mr-1.5 inline size-4 align-[-2px] text-muted-foreground" aria-hidden />
              Sleep stages
              {/* Neutral wording: this is whichever sleep was longest, which is
                  usually but not necessarily the night. */}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {latestStagedSleep.row.start_time.slice(0, 10)} - longest of the last 7 days
              </span>
            </>
          }
          footnote={
            <>
              {formatMinutes(latestStagedSleep.composition.asleepMinutes)} asleep of{" "}
              {formatMinutes(latestStagedSleep.composition.inBedMinutes)} in bed
              {latestStagedSleep.composition.efficiency != null &&
                ` - ${Math.round(latestStagedSleep.composition.efficiency * 100)}% efficiency`}
              . Segments under 2% are widened to stay visible; the figures above are exact.
            </>
          }
        >
          <StackedBar segments={sleepStageSegments} formatValue={formatMinutes} />
        </ChartCard>
      )}

      <SectionHeading>Body</SectionHeading>

      <ChartCard
        hero={
          <MetricHero
            icon={Scale}
            label="Weight"
            reading={weight.reading}
            format={(v) => v.toFixed(1)}
            unit="kg"
          />
        }
        footnote={BAND_NOTE}
      >
        {weight.points.length > 0 ? (
          <TrendChart
            data={weight.points}
            kind="line"
            color="chart-1"
            format={{ decimals: 1, suffix: " kg" }}
            band={weight.band}
          />
        ) : (
          <ChartEmpty>No weight data synced yet.</ChartEmpty>
        )}
      </ChartCard>

      {bodyFat.points.length > 0 && (
        <ChartCard
          hero={
            <MetricHero
              icon={Scale}
              label="Body fat"
              reading={bodyFat.reading}
              format={(v) => v.toFixed(1)}
              unit="%"
            />
          }
          footnote={BAND_NOTE}
        >
          <TrendChart
            data={bodyFat.points}
            kind="line"
            color="chart-1"
            format={{ decimals: 1, suffix: "%" }}
            band={bodyFat.band}
          />
        </ChartCard>
      )}

      <SectionHeading>Daily activity</SectionHeading>

      <ChartCard
        hero={
          <MetricHero
            icon={Footprints}
            label="Steps"
            reading={steps.reading}
            format={(v) => Math.round(v).toLocaleString()}
          />
        }
        footnote={BAND_NOTE}
      >
        {steps.points.length > 0 ? (
          <TrendChart
            data={steps.points}
            kind="bar"
            color="chart-1"
            format={{ grouped: true, suffix: " steps" }}
            band={steps.band}
          />
        ) : (
          <ChartEmpty>No step data synced yet.</ChartEmpty>
        )}
      </ChartCard>

      <ChartCard
        hero={
          <MetricHero
            icon={Flame}
            label="Active zone minutes"
            reading={azm.reading}
            format={(v) => String(Math.round(v))}
            unit="min"
          />
        }
        footnote={BAND_NOTE}
      >
        {azm.points.length > 0 ? (
          <TrendChart
            data={azm.points}
            kind="bar"
            color="chart-1"
            format={{ decimals: 0, suffix: " min" }}
            band={azm.band}
          />
        ) : (
          <ChartEmpty>No active zone minute data synced yet.</ChartEmpty>
        )}
      </ChartCard>
    </>
  )
}
