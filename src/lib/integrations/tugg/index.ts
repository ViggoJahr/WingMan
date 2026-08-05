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

/**
 * Resolves an exercise name to its id, creating the row the first time.
 *
 * Memoised for the lifetime of one sync run: the same handful of lifts recur
 * across every session, so this was issuing a SELECT per exercise per session -
 * hundreds of round trips for a few dozen distinct names. The lookup is
 * case-insensitive, so the cache is keyed on the lowercased name to match.
 */
function exerciseResolver(db: SupabaseClient<Database>) {
  const cache = new Map<string, Promise<string>>()

  async function resolve(name: string): Promise<string> {
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

  return (name: string): Promise<string> => {
    const key = name.toLowerCase()
    // The promise is cached, not the resolved id, so concurrent callers for a
    // brand-new name share one insert rather than racing to create duplicates.
    let pending = cache.get(key)
    if (!pending) {
      pending = resolve(name)
      cache.set(key, pending)
    }
    return pending
  }
}

async function sync(
  account: IntegrationAccountRow,
  db: SupabaseClient<Database>
): Promise<SyncResult> {
  const refreshToken = decrypt(account.refresh_token!)
  const { client: tugg, session } = await createTuggClient(refreshToken)

  // Refresh rotates tokens; persist the new ones so the next sync still works.
  //
  // The error check is not defensive boilerplate - it is the difference between
  // a bad minute and a dead integration. Supabase invalidates the old refresh
  // token the moment it issues a replacement, so if this write does not land,
  // the row keeps a token that is already spent and EVERY future run fails with
  // "Invalid Refresh Token: Already Used" until a human signs in again. It
  // cannot self-heal, and until this throw existed the run went on to report
  // success, which is how it stayed invisible for four days.
  const { error: persistErr } = await db
    .from("integration_accounts")
    .update({
      access_token: encrypt(session.access_token),
      refresh_token: encrypt(session.refresh_token),
      expires_at: session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
    })
    .eq("id", account.id)

  if (persistErr) {
    throw new Error(
      `TUGG token refreshed but could not be saved: ${persistErr.message}. ` +
        "The previous refresh token is now spent, so reconnect TUGG in Settings."
    )
  }

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
  const findOrCreateExercise = exerciseResolver(db)

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
      const exerciseId = await findOrCreateExercise(progress.exercise_name)
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
