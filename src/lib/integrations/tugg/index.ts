import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { decrypt, encrypt } from "@/lib/crypto"
import type { IntegrationAccountRow, SourceAdapter, SyncResult } from "../types"
import {
  createTuggClient,
  fetchDailySessionWorkouts,
  fetchDailyTeamSessions,
  fetchEnduranceRuns,
  fetchExerciseProgress,
  fetchMasTests,
  fetchStrengthTestResults,
  fetchWorkoutAssignments,
  fetchWorkoutExercises,
  fetchWorkoutPlans,
  fetchWorkoutSessions,
} from "./client"
import {
  normalizeEnduranceRun,
  normalizeExerciseSets,
  normalizeMasTest,
  normalizePlanItem,
  normalizeStrengthTestResult,
  normalizeWorkoutSession,
} from "./normalize"

async function findOrCreateExercise(db: SupabaseClient<Database>, name: string) {
  const { data: existing } = await db
    .from("exercises")
    .select("id")
    .ilike("name", name)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await db
    .from("exercises")
    .insert({ name })
    .select("id")
    .single()
  if (error) throw new Error(`Failed to create exercise "${name}": ${error.message}`)
  return created.id
}

async function sync(
  account: IntegrationAccountRow,
  db: SupabaseClient<Database>
): Promise<SyncResult> {
  const refreshToken = decrypt(account.refresh_token!)
  const { client: tugg, session } = await createTuggClient(refreshToken)

  // Refresh rotates tokens; persist the new ones so the next sync still works.
  await db
    .from("integration_accounts")
    .update({
      access_token: encrypt(session.access_token),
      refresh_token: encrypt(session.refresh_token),
      expires_at: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
    })
    .eq("id", account.id)

  const userId = account.user_id
  let itemsSynced = 0

  const [
    workoutSessions,
    exerciseProgress,
    enduranceRuns,
    strengthTestResults,
    masTests,
    workoutAssignments,
    workoutPlans,
    workoutExercises,
    dailyTeamSessions,
    dailySessionWorkouts,
  ] = await Promise.all([
    fetchWorkoutSessions(tugg),
    fetchExerciseProgress(tugg),
    fetchEnduranceRuns(tugg),
    fetchStrengthTestResults(tugg),
    fetchMasTests(tugg),
    fetchWorkoutAssignments(tugg),
    fetchWorkoutPlans(tugg),
    fetchWorkoutExercises(tugg),
    fetchDailyTeamSessions(tugg),
    fetchDailySessionWorkouts(tugg),
  ])

  const planById = new Map(workoutPlans.map((p) => [p.id, p]))
  const assignmentById = new Map(workoutAssignments.map((a) => [a.id, a]))

  // Workout sessions (gym/strength) -> sessions + strength_sessions + exercise_sets
  for (const ws of workoutSessions) {
    const assignment = ws.workout_assignment_id
      ? assignmentById.get(ws.workout_assignment_id)
      : undefined
    const plan = assignment?.workout_plan_id ? planById.get(assignment.workout_plan_id) : undefined

    const { data: sessionRow, error: sessionErr } = await db
      .from("sessions")
      .upsert(normalizeWorkoutSession(ws, plan, userId), {
        onConflict: "external_source,external_id",
      })
      .select("id")
      .single()
    if (sessionErr) throw new Error(`Failed to upsert session for ${ws.id}: ${sessionErr.message}`)

    await db
      .from("strength_sessions")
      .upsert({ session_id: sessionRow.id, focus: plan?.name ?? null }, { onConflict: "session_id" })

    const progressRows = exerciseProgress.filter((p) => p.workout_session_id === ws.id)
    for (const progress of progressRows) {
      const exerciseId = await findOrCreateExercise(db, progress.exercise_name)
      await db
        .from("exercise_sets")
        .delete()
        .eq("session_id", sessionRow.id)
        .eq("exercise_id", exerciseId)
      const sets = normalizeExerciseSets(progress, sessionRow.id, exerciseId)
      if (sets.length > 0) {
        const { error: setsErr } = await db.from("exercise_sets").insert(sets)
        if (setsErr) throw new Error(`Failed to insert exercise sets: ${setsErr.message}`)
      }
    }
    itemsSynced++
  }

  // Endurance runs -> sessions + cardio_sessions
  for (const run of enduranceRuns) {
    const { session: sessionData, cardioDetail } = normalizeEnduranceRun(run, userId)
    const { data: sessionRow, error: sessionErr } = await db
      .from("sessions")
      .upsert(sessionData, { onConflict: "external_source,external_id" })
      .select("id")
      .single()
    if (sessionErr) throw new Error(`Failed to upsert session for run ${run.id}: ${sessionErr.message}`)

    await db
      .from("cardio_sessions")
      .upsert({ session_id: sessionRow.id, ...cardioDetail }, { onConflict: "session_id" })
    itemsSynced++
  }

  // Standalone test records
  for (const row of strengthTestResults) {
    await db
      .from("strength_test_results")
      .upsert(normalizeStrengthTestResult(row, userId), { onConflict: "external_source,external_id" })
    itemsSynced++
  }
  for (const row of masTests) {
    await db
      .from("mas_tests")
      .upsert(normalizeMasTest(row, userId), { onConflict: "external_source,external_id" })
    itemsSynced++
  }

  // Prescribed/planned data -> generic reference blob
  const planRows: Array<{
    resourceType: Parameters<typeof normalizePlanItem>[0]
    row: { id: string }
  }> = [
    ...workoutAssignments.map((row) => ({ resourceType: "workout_assignment" as const, row })),
    ...workoutPlans.map((row) => ({ resourceType: "workout_plan" as const, row })),
    ...workoutExercises.map((row) => ({ resourceType: "workout_exercise" as const, row: row as { id: string } })),
    ...dailyTeamSessions.map((row) => ({ resourceType: "daily_team_session" as const, row: row as { id: string } })),
    ...dailySessionWorkouts.map((row) => ({ resourceType: "daily_session_workout" as const, row: row as { id: string } })),
  ]
  for (const { resourceType, row } of planRows) {
    await db
      .from("external_plan_items")
      .upsert(normalizePlanItem(resourceType, row, userId), {
        onConflict: "resource_type,external_source,external_id",
      })
    itemsSynced++
  }

  return { itemsSynced }
}

export const tuggAdapter: SourceAdapter = {
  source: "tugg",
  sync,
}
