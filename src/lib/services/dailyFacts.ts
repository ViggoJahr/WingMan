import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { isoDaysAgo } from "@/lib/dates"

export type DailyFact = Database["public"]["Views"]["daily_facts"]["Row"]

/**
 * A daily_facts row with the nullable day/user narrowed away. Every row the
 * view produces has both, but they are typed nullable because Postgres cannot
 * prove non-nullability through the outer joins.
 */
export type DailyFactRow = DailyFact & { day: string }

/**
 * Reads one numeric fact off a row. PostgREST hands `numeric` columns back as
 * strings, so every consumer would otherwise have to coerce defensively.
 */
export function factNumber(value: number | string | null | undefined): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Only what something actually renders.
 *
 * This used to pull all 35 columns while the dashboard displayed six - the
 * largest over-fetch in the app, on the query that runs on every page load.
 * Dropped for having no consumer anywhere: total_load, sessions_with_rpe,
 * max_rpe, total_duration_min, had_practice, had_strength,
 * readiness_training_load, body_fat_percentage, dow, is_weekend,
 * days_since_last_match.
 *
 * They remain columns on the view, so adding one back is a word on this line -
 * which is the point of the keystone view, and why removing them costs nothing.
 * `days_since_last_match` and `dow` in particular are there waiting for the
 * drivers view; they just should not be paid for until it exists.
 */
export const DAILY_FACT_COLUMNS =
  "day, session_count, load_estimate, sessions_with_intensity, calories_kcal, " +
  "had_match, perceived_performance, perceived_challenge, " +
  "readiness_score, muscle_soreness, mental_stress, current_injury, current_illness, " +
  "sleep_quality, food_beverage, mood, recovery_energy, " +
  "weight_kg, steps, resting_heart_rate, " +
  "avg_hrv_ms, avg_spo2_percentage, active_zone_minutes, sleep_hours"

/**
 * Reads a trailing window of daily facts, oldest first. RLS on the underlying
 * tables scopes this to the caller, so no explicit user filter is needed.
 *
 * Rolling metrics need CHRONIC_DAYS of history *before* the window you intend
 * to display, so ask for more days than you plan to render.
 */
export async function fetchDailyFacts(
  db: SupabaseClient<Database>,
  { days, columns = DAILY_FACT_COLUMNS }: { days: number; columns?: string }
): Promise<DailyFactRow[]> {
  const { data, error } = await db
    .from("daily_facts")
    .select(columns)
    .gte("day", isoDaysAgo(days))
    .order("day", { ascending: true })

  if (error) {
    throw new Error(
      `Failed to load daily_facts: ${error.message}. ` +
        "If this says the relation does not exist, run `npx supabase db push` to apply pending migrations."
    )
  }

  return ((data ?? []) as unknown as DailyFact[]).filter((r): r is DailyFactRow => r.day != null)
}

/**
 * One numeric column as a series, oldest first, gaps preserved as null.
 *
 * The nulls matter and must not be filtered here: `computeBaseline` drops them
 * so a day without a reading cannot drag the mean, while `Sparkline` uses them
 * to break the trace. Handing either of them a pre-compacted array would make a
 * fortnight of missing HRV render as a confident straight line.
 */
export function factSeries(
  rows: readonly DailyFactRow[],
  key: keyof DailyFactRow
): (number | null)[] {
  return rows.map((row) => factNumber(row[key] as number | string | null))
}
