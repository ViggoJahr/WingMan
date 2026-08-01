import { createClient, type Session } from "@supabase/supabase-js"

function tuggUrl() {
  return process.env.TUGG_SUPABASE_URL!
}

function tuggAnonKey() {
  return process.env.TUGG_SUPABASE_ANON_KEY!
}

// One-time: exchange the user's TUGG email/password for a session. Only used
// when first connecting the integration - afterwards we refresh instead.
export async function signInToTugg(email: string, password: string): Promise<Session> {
  const supabase = createClient(tuggUrl(), tuggAnonKey())
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new Error(`TUGG sign-in failed: ${error?.message}`)
  }
  return data.session
}

// Returns a client authenticated with the given (possibly refreshed) session,
// plus the current session in case refreshSession rotated the tokens.
export async function createTuggClient(refreshToken: string) {
  const supabase = createClient(tuggUrl(), tuggAnonKey())
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
  if (error || !data.session) {
    throw new Error(`TUGG session refresh failed: ${error?.message}`)
  }
  return { client: supabase, session: data.session }
}

export interface TuggWorkoutSession {
  id: string
  workout_assignment_id: string | null
  player_id: string
  start_time: string
  end_time: string | null
  status: string
  total_session_time: number | null
}

export interface TuggExerciseProgress {
  id: string
  workout_session_id: string
  exercise_name: string
  exercise_index: number
  sets_data: Array<{ reps: string; weight: string; completed: boolean; setNumber: number }> | null
}

export interface TuggEnduranceRun {
  id: string
  plan_name: string | null
  completed_at: string
  duration_sec: number | null
  distance_m: number | null
  source: string | null
  rpe: number | null
  activity_type: string | null
  notes: string | null
}

export interface TuggStrengthTestResult {
  id: string
  test_type: string
  weight: number | null
  reps: number | null
  estimated_1rm: number | null
  test_date: string
  verification_status: string | null
}

export interface TuggMasTest {
  id: string
  test_time_seconds: number | null
  mas_mps: number | null
  test_date: string
}

export interface TuggWorkoutAssignment {
  id: string
  workout_plan_id: string | null
  status: string
}

export interface TuggWorkoutPlan {
  id: string
  name: string
  workout_type: string | null
}

type TuggClient = Awaited<ReturnType<typeof createTuggClient>>["client"]

/**
 * PostgREST's default ceiling. A plain `select("*")` returns at most this many
 * rows and reports success - it does not error, and there is no flag in the
 * response saying the result was cut short. That is what made this the largest
 * correctness risk in the repo: it fails silently and gets worse with every
 * session logged.
 */
export const TUGG_PAGE_SIZE = 1000

/**
 * Guard against an unbounded loop if a page never shrinks - a filter that stops
 * matching, or a server that ignores `range`. A million rows from TUGG would be
 * a bug worth failing on rather than paging through forever.
 */
const MAX_PAGES = 1000

/**
 * Minimal shape of what pagination needs, so the loop can be tested against a
 * fake rather than a live TUGG project.
 */
export interface PagedQuery<T> {
  order: (column: string, opts: { ascending: boolean }) => PagedQuery<T>
  gte: (column: string, value: string) => PagedQuery<T>
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
}

export interface PagedSource<T> {
  from: (table: string) => { select: (columns: string) => PagedQuery<T> }
}

/**
 * Reads a whole table in pages.
 *
 * Ordering by `id` is not cosmetic: `range` without a deterministic sort lets
 * Postgres return rows in any order per request, so a row can appear on two
 * pages or none. Every TUGG table has an `id`.
 */
export async function fetchPaged<T>(
  client: PagedSource<T>,
  table: string,
  options: { since?: { column: string; value: string } } = {}
): Promise<T[]> {
  const rows: T[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    let query = client.from(table).select("*").order("id", { ascending: true })
    if (options.since) query = query.gte(options.since.column, options.since.value)

    const from = page * TUGG_PAGE_SIZE
    const { data, error } = await query.range(from, from + TUGG_PAGE_SIZE - 1)
    if (error) throw new Error(`TUGG fetch ${table} failed: ${error.message}`)

    const batch = data ?? []
    rows.push(...batch)
    // A short page is the only reliable end-of-table signal PostgREST gives.
    if (batch.length < TUGG_PAGE_SIZE) return rows
  }

  throw new Error(
    `TUGG fetch ${table} exceeded ${MAX_PAGES} pages (${MAX_PAGES * TUGG_PAGE_SIZE} rows) - refusing to continue`
  )
}

/**
 * Pagination alone, deliberately - no date window yet.
 *
 * The roadmap suggested a cursor mirroring Google Health's SYNC_WINDOW_DAYS.
 * Paging is what actually fixes the bug, and a window would trade correctness
 * for a saving that does not yet exist: the largest TUGG sync so far moved 326
 * rows, and the tables split awkwardly - `exercise_progress`, the one most
 * likely to grow, has no event date at all, while `test_date` is a `date` and
 * `start_time` a `timestamptz`, so one cutoff value does not serve both.
 *
 * A window also silently skips rows edited after they age out, which is exactly
 * the class of quiet wrongness being fixed here. `fetchPaged` takes a `since`
 * option for when volume justifies it; until then, reading everything in pages
 * is both correct and cheap.
 */
function fetchAll<T>(client: TuggClient, table: string): Promise<T[]> {
  return fetchPaged<T>(client as unknown as PagedSource<T>, table)
}

export const fetchWorkoutSessions = (client: TuggClient) =>
  fetchAll<TuggWorkoutSession>(client, "workout_sessions")
export const fetchExerciseProgress = (client: TuggClient) =>
  fetchAll<TuggExerciseProgress>(client, "exercise_progress")
export const fetchEnduranceRuns = (client: TuggClient) =>
  fetchAll<TuggEnduranceRun>(client, "endurance_runs")
export const fetchStrengthTestResults = (client: TuggClient) =>
  fetchAll<TuggStrengthTestResult>(client, "strength_test_results")
export const fetchMasTests = (client: TuggClient) =>
  fetchAll<TuggMasTest>(client, "player_mas_tests")
export const fetchWorkoutAssignments = (client: TuggClient) =>
  fetchAll<TuggWorkoutAssignment>(client, "workout_assignments")
export const fetchWorkoutPlans = (client: TuggClient) =>
  fetchAll<TuggWorkoutPlan>(client, "workout_plans")
export const fetchWorkoutExercises = (client: TuggClient) =>
  fetchAll<Record<string, unknown>>(client, "workout_exercises")
export const fetchDailyTeamSessions = (client: TuggClient) =>
  fetchAll<Record<string, unknown>>(client, "daily_team_sessions")
export const fetchDailySessionWorkouts = (client: TuggClient) =>
  fetchAll<Record<string, unknown>>(client, "daily_session_workouts")
