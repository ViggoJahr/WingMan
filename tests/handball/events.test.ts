import { describe, expect, it } from "vitest"
import {
  EVENT_META,
  EVENT_TYPE_BY_KEY,
  PALETTE_EVENT_TYPES,
  SHOT_ORIGIN_BY_KEY,
  deriveBoxScore,
  type MatchEventLike,
} from "@/lib/handball/events"

function event(event_type: string, shot_origin: string | null = null): MatchEventLike {
  return { event_type, shot_origin }
}

describe("deriveBoxScore", () => {
  it("returns all zeros for a match with no events", () => {
    const score = deriveBoxScore([])
    expect(Object.values(score).every((value) => value === 0)).toBe(true)
  })

  it("counts each outcome into its own counter", () => {
    const score = deriveBoxScore([
      event("goal"),
      event("goal"),
      event("assist"),
      event("technical_fault"),
      event("steal"),
      event("block"),
      event("shot_missed"),
      event("shot_saved"),
      event("suspension_created"),
      event("suspension_received"),
      event("big_mistake"),
    ])

    expect(score.goals).toBe(2)
    expect(score.assists).toBe(1)
    expect(score.technical_faults).toBe(1)
    expect(score.steals).toBe(1)
    expect(score.blocks).toBe(1)
    expect(score.shots_missed).toBe(1)
    expect(score.shots_saved).toBe(1)
    expect(score.suspensions_created).toBe(1)
    expect(score.suspensions_received).toBe(1)
    expect(score.big_mistakes).toBe(1)
  })

  it("counts origin independently of outcome, so a 9m goal feeds both", () => {
    // This is the whole reason origin is a separate dimension: the legacy
    // nine_m_shots counter always double-counted with goals, and one tag has to
    // reproduce that rather than making you log the shot twice.
    const score = deriveBoxScore([event("goal", "nine_m")])

    expect(score.goals).toBe(1)
    expect(score.nine_m_shots).toBe(1)
  })

  it("counts 9m attempts that were missed or saved, not just the ones scored", () => {
    const score = deriveBoxScore([
      event("goal", "nine_m"),
      event("shot_missed", "nine_m"),
      event("shot_saved", "nine_m"),
    ])

    expect(score.nine_m_shots).toBe(3) // every attempt from 9m, however it ended
    expect(score.goals).toBe(1)
    expect(score.shots_missed).toBe(1)
    expect(score.shots_saved).toBe(1)
  })

  it("lets a backfilled shot_attempt carry an origin without inflating outcomes", () => {
    // Legacy rows recorded that N attempts came from 9m but not how they ended.
    const score = deriveBoxScore([event("shot_attempt", "nine_m"), event("shot_attempt", "breakthrough")])

    expect(score.nine_m_shots).toBe(1)
    expect(score.breakthroughs).toBe(1)
    expect(score.goals).toBe(0)
    expect(score.shots_missed).toBe(0)
    expect(score.shots_saved).toBe(0)
  })

  it("ignores origins that map to no counter, so wing shots don't leak into 9m", () => {
    const score = deriveBoxScore([event("goal", "wing"), event("goal", "fastbreak")])

    expect(score.goals).toBe(2)
    expect(score.nine_m_shots).toBe(0)
    expect(score.breakthroughs).toBe(0)
  })

  it("tallies a full match fixture to a hand-written box score", () => {
    const score = deriveBoxScore([
      event("goal", "nine_m"),
      event("goal", "breakthrough"),
      event("goal", "wing"),
      event("shot_missed", "nine_m"),
      event("shot_saved", "seven_metre"),
      event("assist"),
      event("assist"),
      event("steal"),
      event("technical_fault"),
      event("block"),
      event("suspension_created"),
      event("big_mistake"),
    ])

    expect(score).toEqual({
      goals: 3,
      shots_missed: 1,
      shots_saved: 1,
      nine_m_shots: 2, // one scored, one missed
      breakthroughs: 1,
      technical_faults: 1,
      assists: 2,
      suspensions_created: 1,
      suspensions_received: 0,
      steals: 1,
      blocks: 1,
      big_mistakes: 0 + 1,
    })
  })
})

describe("palette and shortcuts", () => {
  it("hides shot_attempt, which exists only for the backfill", () => {
    expect(PALETTE_EVENT_TYPES).not.toContain("shot_attempt")
    expect(EVENT_META.shot_attempt.hidden).toBe(true)
  })

  it("gives every palette entry a unique shortcut key", () => {
    const keys = PALETTE_EVENT_TYPES.map((type) => EVENT_META[type].key)
    expect(keys.every((key) => key.length === 1)).toBe(true)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("never binds an event key to a digit, since digits set shot origin", () => {
    // suspension_received used to want "2" for "2 minutes" - that would have
    // silently shadowed the origin shortcut.
    const eventKeys = Object.keys(EVENT_TYPE_BY_KEY)
    const originKeys = Object.keys(SHOT_ORIGIN_BY_KEY)
    expect(eventKeys.some((key) => originKeys.includes(key))).toBe(false)
  })

  it("maps digits 1-7 onto the shot origins in order", () => {
    expect(SHOT_ORIGIN_BY_KEY["1"]).toBe("nine_m")
    expect(SHOT_ORIGIN_BY_KEY["7"]).toBe("other")
    expect(Object.keys(SHOT_ORIGIN_BY_KEY)).toHaveLength(7)
  })
})
