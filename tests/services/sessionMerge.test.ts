import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { mergeOverlappingSessions } from "@/lib/services/sessionMerge"
import { fakeSupabase, type Row } from "../support/fakeSupabase"

const USER = "user-1"

function iso(offsetHours: number): string {
  return new Date(Date.now() + offsetHours * 3_600_000).toISOString()
}

function session(overrides: Partial<Row> & { id: string }): Row {
  return {
    user_id: USER,
    external_source: null,
    merged_into: null,
    start_time: iso(-2),
    end_time: iso(-1),
    rpe: null,
    calories_kcal: null,
    active_duration_seconds: null,
    active_zone_minutes: null,
    hr_zones: null,
    ...overrides,
  }
}

function run(tables: Record<string, Row[]>) {
  const fake = fakeSupabase({ exercise_sets: [], cardio_sessions: [], matches: [], team_practices: [], ...tables })
  return {
    fake,
    result: mergeOverlappingSessions(USER, fake.client as unknown as SupabaseClient<Database>),
  }
}

describe("mergeOverlappingSessions", () => {
  it("does nothing with fewer than two candidates", async () => {
    const { fake, result } = run({ sessions: [session({ id: "a", external_source: "tugg" })] })
    expect(await result).toEqual({ merged: 0 })
    expect(fake.updates).toHaveLength(0)
  })

  it("never merges two sessions from the same source", async () => {
    // Two real gym sessions on the same day are two sessions, not a duplicate.
    const { fake, result } = run({
      sessions: [
        session({ id: "a", external_source: "tugg" }),
        session({ id: "b", external_source: "tugg" }),
      ],
    })
    expect(await result).toEqual({ merged: 0 })
    expect(fake.updates).toHaveLength(0)
  })

  it("leaves non-overlapping sessions alone", async () => {
    const { result } = run({
      sessions: [
        session({ id: "a", external_source: "tugg", start_time: iso(-6), end_time: iso(-5) }),
        session({ id: "b", external_source: "google_health", start_time: iso(-2), end_time: iso(-1) }),
      ],
    })
    expect(await result).toEqual({ merged: 0 })
  })

  it("merges an overlap across sources, keeping the richer session", async () => {
    const { fake, result } = run({
      sessions: [
        session({ id: "sparse", external_source: "tugg" }),
        session({
          id: "rich",
          external_source: "google_health",
          calories_kcal: 400,
          active_duration_seconds: 3000,
          hr_zones: { light_sec: 60 },
        }),
      ],
    })

    expect(await result).toEqual({ merged: 1 })
    const rows = fake.rows("sessions")
    expect(rows.find((r) => r.id === "sparse")!.merged_into).toBe("rich")
    expect(rows.find((r) => r.id === "rich")!.merged_into).toBeNull()
  })

  it("marks the loser merged_into rather than deleting it", async () => {
    // The original source data has to stay reachable - merging is not a delete.
    const { fake, result } = run({
      sessions: [
        session({ id: "a", external_source: "tugg", rpe: 15 }),
        session({ id: "b", external_source: "google_health" }),
      ],
    })
    await result
    expect(fake.rows("sessions")).toHaveLength(2)
    expect(fake.rows("sessions").find((r) => r.id === "b")!.merged_into).toBe("a")
  })

  it("backfills only the fields the winner is missing", async () => {
    const { fake, result } = run({
      sessions: [
        session({ id: "winner", external_source: "tugg", rpe: 15, calories_kcal: 100 }),
        session({ id: "loser", external_source: "google_health", rpe: 9, active_zone_minutes: 42 }),
      ],
    })
    await result

    const winner = fake.rows("sessions").find((r) => r.id === "winner")!
    // Its own rpe survives; the field it lacked is filled in.
    expect(winner.rpe).toBe(15)
    expect(winner.active_zone_minutes).toBe(42)
    expect(winner.calories_kcal).toBe(100)
  })

  it("lets hand-entered exercise sets beat a richer auto-detected session", async () => {
    // richnessScore returns 1000 for hand-entered detail precisely so a tracker
    // summary with more populated columns cannot win.
    const { fake, result } = run({
      sessions: [
        session({ id: "manual", external_source: "tugg" }),
        session({
          id: "tracker",
          external_source: "google_health",
          rpe: 12,
          calories_kcal: 500,
          active_duration_seconds: 3600,
          active_zone_minutes: 30,
          hr_zones: { light_sec: 10 },
        }),
      ],
      exercise_sets: [{ session_id: "manual" }],
    })
    await result

    expect(fake.rows("sessions").find((r) => r.id === "tracker")!.merged_into).toBe("manual")
  })

  it("lets a real logged match beat an unclassified HANDBALL blip", async () => {
    // The case the richness rule was written for: Google Health auto-creates a
    // bare handball session, and it must lose to the match you actually logged.
    const { fake, result } = run({
      sessions: [
        session({ id: "logged-match", external_source: null }),
        session({ id: "auto-blip", external_source: "google_health", calories_kcal: 300 }),
      ],
      matches: [{ session_id: "logged-match" }],
    })
    await result

    expect(fake.rows("sessions").find((r) => r.id === "auto-blip")!.merged_into).toBe("logged-match")
  })

  it("does not treat a bare handball_sessions row as real detail", async () => {
    // Only a matches or team_practices row counts - handball_sessions alone is
    // what the auto-detection creates, so it must not win on that basis.
    const { fake, result } = run({
      sessions: [
        session({ id: "auto", external_source: "google_health" }),
        session({ id: "richer", external_source: "tugg", rpe: 14, calories_kcal: 200 }),
      ],
      handball_sessions: [{ session_id: "auto", subtype: "individual" }],
    })
    await result

    expect(fake.rows("sessions").find((r) => r.id === "auto")!.merged_into).toBe("richer")
  })

  it("backfills cardio detail when both sides have a cardio row", async () => {
    const { fake, result } = run({
      sessions: [
        session({ id: "winner", external_source: "tugg", rpe: 15 }),
        session({ id: "loser", external_source: "google_health" }),
      ],
      cardio_sessions: [
        { session_id: "winner", focus: "Run", distance_m: null, avg_hr: null },
        { session_id: "loser", focus: "Running", distance_m: 8000, avg_hr: 155 },
      ],
    })
    await result

    const cardio = fake.rows("cardio_sessions").find((r) => r.session_id === "winner")!
    expect(cardio.distance_m).toBe(8000)
    expect(cardio.avg_hr).toBe(155)
  })

  it("ignores sessions with no end time, which cannot be tested for overlap", async () => {
    const { result } = run({
      sessions: [
        session({ id: "a", external_source: "tugg", end_time: null }),
        session({ id: "b", external_source: "google_health" }),
      ],
    })
    expect(await result).toEqual({ merged: 0 })
  })

  it("ignores sessions already merged away", async () => {
    const { result } = run({
      sessions: [
        session({ id: "a", external_source: "tugg", merged_into: "old" }),
        session({ id: "b", external_source: "google_health" }),
      ],
    })
    expect(await result).toEqual({ merged: 0 })
  })

  it("ignores sessions older than the merge window", async () => {
    // 60 days. Anything older has already been merged and cannot gain a new
    // counterpart, because every source writes inside its own sync window.
    const { result } = run({
      sessions: [
        session({ id: "old-a", external_source: "tugg", start_time: iso(-24 * 90), end_time: iso(-24 * 90 + 1) }),
        session({ id: "old-b", external_source: "google_health", start_time: iso(-24 * 90), end_time: iso(-24 * 90 + 1) }),
      ],
    })
    expect(await result).toEqual({ merged: 0 })
  })

  it("merges each pair once when three sources overlap", async () => {
    const { fake, result } = run({
      sessions: [
        session({ id: "a", external_source: "tugg", rpe: 15 }),
        session({ id: "b", external_source: "google_health" }),
        session({ id: "c", external_source: "other" }),
      ],
    })

    expect(await result).toEqual({ merged: 2 })
    const rows = fake.rows("sessions")
    expect(rows.find((r) => r.id === "a")!.merged_into).toBeNull()
    expect(rows.find((r) => r.id === "b")!.merged_into).toBe("a")
    expect(rows.find((r) => r.id === "c")!.merged_into).toBe("a")
  })

  it("throws with context when the session query fails", async () => {
    const fake = fakeSupabase({ sessions: [] }, { failOn: ["sessions"] })
    await expect(
      mergeOverlappingSessions(USER, fake.client as unknown as SupabaseClient<Database>)
    ).rejects.toThrow(/Failed to load sessions for merge/)
  })
})
