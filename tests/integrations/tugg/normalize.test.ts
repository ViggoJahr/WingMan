import { describe, expect, it } from "vitest"
import {
  normalizeEnduranceRun,
  normalizeExerciseSets,
  normalizeMasTest,
  normalizePlanItem,
  normalizeStrengthTestResult,
  normalizeWorkoutSession,
} from "@/lib/integrations/tugg/normalize"

const USER_ID = "user-fixture-id"

describe("normalizeWorkoutSession", () => {
  it("maps a strength workout plan to strength_power", () => {
    const ws = {
      id: "ws-1",
      workout_assignment_id: "wa-1",
      player_id: "player-1",
      start_time: "2026-05-16T06:00:00.000Z",
      end_time: "2026-05-16T07:00:00.000Z",
      status: "auto_completed",
      total_session_time: null,
    }
    const plan = { id: "plan-1", name: "Pushpass", workout_type: "strength" }

    const result = normalizeWorkoutSession(ws, plan, USER_ID)

    expect(result.type).toBe("strength_power")
    expect(result.external_source).toBe("tugg")
    expect(result.external_id).toBe("ws-1")
    expect(result.user_id).toBe(USER_ID)
  })

  it("falls back to strength_power when there is no plan", () => {
    const ws = {
      id: "ws-2",
      workout_assignment_id: null,
      player_id: "player-1",
      start_time: "2026-05-16T06:00:00.000Z",
      end_time: null,
      status: "in_progress",
      total_session_time: null,
    }

    const result = normalizeWorkoutSession(ws, undefined, USER_ID)
    expect(result.type).toBe("strength_power")
  })
})

describe("normalizeExerciseSets", () => {
  it("expands sets_data into one row per set", () => {
    const progress = {
      id: "ep-1",
      workout_session_id: "ws-1",
      exercise_name: "Goblet Squat",
      exercise_index: 0,
      sets_data: [
        { reps: "10", weight: "20", completed: true, setNumber: 1 },
        { reps: "8", weight: "22.5", completed: true, setNumber: 2 },
      ],
    }

    const sets = normalizeExerciseSets(progress, "session-1", "exercise-1")

    expect(sets).toHaveLength(2)
    expect(sets[0]).toMatchObject({
      session_id: "session-1",
      exercise_id: "exercise-1",
      set_number: 1,
      weight_kg: 20,
      reps: 10,
    })
    expect(sets[1].weight_kg).toBe(22.5)
  })

  it("returns an empty array when sets_data is null", () => {
    const progress = {
      id: "ep-2",
      workout_session_id: "ws-1",
      exercise_name: "Bench Press",
      exercise_index: 1,
      sets_data: null,
    }
    expect(normalizeExerciseSets(progress, "session-1", "exercise-2")).toEqual([])
  })
})

describe("normalizeEnduranceRun", () => {
  it("derives start_time from completed_at minus duration", () => {
    const run = {
      id: "run-1",
      plan_name: "Intervals",
      completed_at: "2026-05-21T12:15:00.000Z",
      duration_sec: 900,
      distance_m: 3000,
      source: "manual",
      rpe: 8,
      activity_type: "run",
      notes: null,
    }

    const { session, cardioDetail } = normalizeEnduranceRun(run, USER_ID)

    expect(session.end_time).toBe("2026-05-21T12:15:00.000Z")
    expect(session.start_time).toBe("2026-05-21T12:00:00.000Z")
    expect(session.rpe).toBe(8)
    expect(cardioDetail.distance_m).toBe(3000)
    expect(cardioDetail.focus).toBe("run")
  })
})

describe("normalizeStrengthTestResult / normalizeMasTest / normalizePlanItem", () => {
  it("maps strength test fields directly", () => {
    const row = {
      id: "st-1",
      test_type: "bänk",
      weight: 80,
      reps: 5,
      estimated_1rm: 92.5,
      test_date: "2026-05-19",
      verification_status: "verified",
    }
    const result = normalizeStrengthTestResult(row, USER_ID)
    expect(result.test_type).toBe("bänk")
    expect(result.external_id).toBe("st-1")
  })

  it("maps MAS test fields directly", () => {
    const row = { id: "mas-1", test_time_seconds: 273, mas_mps: 4.4, test_date: "2026-06-01" }
    const result = normalizeMasTest(row, USER_ID)
    expect(result.mas_mps).toBe(4.4)
  })

  it("wraps arbitrary plan rows with a resource_type tag", () => {
    const row = { id: "wa-1", status: "active" }
    const result = normalizePlanItem("workout_assignment", row, USER_ID)
    expect(result.resource_type).toBe("workout_assignment")
    expect(result.external_id).toBe("wa-1")
  })
})
