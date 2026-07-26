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

export const DAILY_FACT_COLUMNS =
  "day, session_count, total_load, load_estimate, sessions_with_intensity, " +
  "sessions_with_rpe, max_rpe, total_duration_min, calories_kcal, " +
  "had_match, had_practice, had_strength, perceived_performance, perceived_challenge, " +
  "readiness_score, muscle_soreness, mental_stress, current_injury, current_illness, " +
  "sleep_quality, food_beverage, mood, recovery_energy, readiness_training_load, " +
  "weight_kg, body_fat_percentage, steps, resting_heart_rate, " +
  "avg_hrv_ms, avg_spo2_percentage, active_zone_minutes, sleep_hours, dow, " +
  "is_weekend, days_since_last_match"

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
