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

async function fetchAll<T>(client: TuggClient, table: string): Promise<T[]> {
  const { data, error } = await client.from(table).select("*")
  if (error) throw new Error(`TUGG fetch ${table} failed: ${error.message}`)
  return (data ?? []) as T[]
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
