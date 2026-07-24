import type { Json } from "@/lib/supabase/types"
import type {
  TuggEnduranceRun,
  TuggExerciseProgress,
  TuggMasTest,
  TuggStrengthTestResult,
  TuggWorkoutPlan,
  TuggWorkoutSession,
} from "./client"

type SessionType = "strength_power" | "cardio" | "mobility_rehab" | "active_rest" | "handball"

// TUGG rows are plain JSON-serializable objects; this just satisfies the
// Json type's recursive shape for storage in a jsonb column.
function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value))
}

function mapWorkoutType(workoutType: string | null | undefined): SessionType {
  switch (workoutType) {
    case "strength":
      return "strength_power"
    case "cardio":
      return "cardio"
    case "mobility":
    case "recovery":
      return "mobility_rehab"
    default:
      return "strength_power"
  }
}

export function normalizeWorkoutSession(
  ws: TuggWorkoutSession,
  plan: TuggWorkoutPlan | undefined,
  userId: string
) {
  return {
    user_id: userId,
    type: mapWorkoutType(plan?.workout_type),
    start_time: ws.start_time,
    end_time: ws.end_time,
    external_source: "tugg",
    external_id: ws.id,
    raw_payload: toJson(ws),
  }
}

export function normalizeExerciseSets(
  progress: TuggExerciseProgress,
  sessionId: string,
  exerciseId: string
) {
  const sets = progress.sets_data ?? []
  return sets.map((set) => ({
    session_id: sessionId,
    exercise_id: exerciseId,
    set_number: set.setNumber,
    weight_kg: set.weight ? Number(set.weight) : null,
    reps: set.reps ? Number(set.reps) : null,
  }))
}

export function normalizeEnduranceRun(run: TuggEnduranceRun, userId: string) {
  const endTime = new Date(run.completed_at)
  const startTime = run.duration_sec
    ? new Date(endTime.getTime() - run.duration_sec * 1000)
    : endTime

  return {
    session: {
      user_id: userId,
      type: "cardio" as const,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      rpe: run.rpe,
      external_source: "tugg",
      external_id: run.id,
      raw_payload: toJson(run),
    },
    cardioDetail: {
      focus: run.activity_type ?? run.plan_name ?? null,
      distance_m: run.distance_m,
      avg_hr: null as number | null,
    },
  }
}

export function normalizeStrengthTestResult(row: TuggStrengthTestResult, userId: string) {
  return {
    user_id: userId,
    test_type: row.test_type,
    weight: row.weight,
    reps: row.reps,
    estimated_1rm: row.estimated_1rm,
    test_date: row.test_date,
    verification_status: row.verification_status,
    external_source: "tugg",
    external_id: row.id,
    raw_payload: toJson(row),
  }
}

export function normalizeMasTest(row: TuggMasTest, userId: string) {
  return {
    user_id: userId,
    test_time_seconds: row.test_time_seconds,
    mas_mps: row.mas_mps,
    test_date: row.test_date,
    external_source: "tugg",
    external_id: row.id,
    raw_payload: toJson(row),
  }
}

export function normalizePlanItem(
  resourceType:
    | "workout_assignment"
    | "workout_plan"
    | "workout_exercise"
    | "daily_team_session"
    | "daily_session_workout",
  row: { id: string },
  userId: string
) {
  return {
    user_id: userId,
    resource_type: resourceType,
    external_source: "tugg",
    external_id: row.id,
    payload: toJson(row),
  }
}
