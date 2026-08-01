// The match event taxonomy. This is the authoritative TS counterpart to the
// CHECK constraints in 20260728090000_match_videos_and_events.sql - the Zod
// schemas, the tagging palette and the derived box score all read from here, so
// the vocabulary can only drift in one place.
//
// OUTCOME and ORIGIN are separate dimensions. The 12 legacy counters on
// `matches` are not 12 parallel things: nine_m_shots and breakthroughs describe
// where a shot came from and already double-count with goals. Keeping origin as
// a qualifier means one tag ("goal, from 9m") feeds three counters instead of
// forcing you to log the same shot twice.

export const MATCH_EVENT_TYPES = [
  "goal",
  "team_goal",
  "opponent_goal",
  "shot_missed",
  "shot_saved",
  "shot_attempt",
  "assist",
  "technical_fault",
  "steal",
  "block",
  "suspension_created",
  "suspension_received",
  "big_mistake",
] as const

export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number]

export const SHOT_ORIGINS = [
  "nine_m",
  "breakthrough",
  "wing",
  "pivot",
  "fastbreak",
  "seven_metre",
  "other",
] as const

export type ShotOrigin = (typeof SHOT_ORIGINS)[number]

export const MATCH_PHASES = ["positional", "counter", "power_play", "short_handed"] as const

export type MatchPhase = (typeof MATCH_PHASES)[number]

export const EVENT_SOURCES = ["video", "live", "backfill"] as const

export type EventSource = (typeof EVENT_SOURCES)[number]

export interface EventMeta {
  label: string
  /** Single-key shortcut, no modifier. Must stay unique across the palette. */
  key: string
  group: "shot" | "play" | "discipline" | "score"
  tone: "good" | "bad" | "neutral"
  /** shot_attempt exists only for the backfill; it is never offered as a tag. */
  hidden?: boolean
}

export const EVENT_META: Record<MatchEventType, EventMeta> = {
  goal: { label: "Goal", key: "g", group: "shot", tone: "good" },
  // The scoreboard's other two thirds. `goal` means *you* scored and feeds your
  // personal counter, so the team score cannot be derived from it alone - a
  // teammate's goal moves the score without being anything you did, and a
  // conceded goal moves it the other way.
  //
  // They keep the `u` and `i` bindings that used to nudge the old snapshot
  // counters, so the muscle memory survives; the difference is that they now
  // create real events the score can be counted from.
  team_goal: { label: "Team goal", key: "u", group: "score", tone: "neutral" },
  opponent_goal: { label: "Goal against", key: "i", group: "score", tone: "bad" },
  shot_missed: { label: "Missed", key: "m", group: "shot", tone: "bad" },
  shot_saved: { label: "Saved", key: "s", group: "shot", tone: "bad" },
  shot_attempt: { label: "Shot", key: "", group: "shot", tone: "neutral", hidden: true },
  assist: { label: "Assist", key: "a", group: "play", tone: "good" },
  technical_fault: { label: "Tech fault", key: "t", group: "play", tone: "bad" },
  steal: { label: "Steal", key: "x", group: "play", tone: "good" },
  block: { label: "Block", key: "b", group: "play", tone: "good" },
  suspension_created: { label: "2min won", key: "w", group: "discipline", tone: "good" },
  // "r" for received, not "2": the digits are reserved for shot origin on the
  // active event, so a numeric shortcut here would collide.
  suspension_received: { label: "2min against", key: "r", group: "discipline", tone: "bad" },
  big_mistake: { label: "Big mistake", key: "e", group: "play", tone: "bad" },
}

/** Everything offered in the tagging palette, in palette order. */
export const PALETTE_EVENT_TYPES = MATCH_EVENT_TYPES.filter(
  (type) => !EVENT_META[type].hidden
)

export const SHOT_ORIGIN_LABELS: Record<ShotOrigin, string> = {
  nine_m: "9m",
  breakthrough: "Breakthrough",
  wing: "Wing",
  pivot: "Pivot",
  fastbreak: "Fastbreak",
  seven_metre: "7m",
  other: "Other",
}

export const PHASE_LABELS: Record<MatchPhase, string> = {
  positional: "Positional",
  counter: "Counter",
  power_play: "Power play",
  short_handed: "Short handed",
}

/**
 * Seeking to the exact tagged instant drops you into the middle of the action.
 * Applied at playback time only - never baked into video_offset_seconds, so the
 * lead-in can be retuned without rewriting data.
 */
export const CLIP_LEAD_IN_SECONDS = 6

export interface MatchEventLike {
  event_type: string
  shot_origin?: string | null
}

export interface BoxScore {
  goals: number
  shots_missed: number
  shots_saved: number
  nine_m_shots: number
  breakthroughs: number
  technical_faults: number
  assists: number
  suspensions_created: number
  suspensions_received: number
  steals: number
  blocks: number
  big_mistakes: number
}

const EMPTY_BOX_SCORE: BoxScore = {
  goals: 0,
  shots_missed: 0,
  shots_saved: 0,
  nine_m_shots: 0,
  breakthroughs: 0,
  technical_faults: 0,
  assists: 0,
  suspensions_created: 0,
  suspensions_received: 0,
  steals: 0,
  blocks: 0,
  big_mistakes: 0,
}

/** event_type -> the counter it increments. Origin-derived counters are not here. */
const OUTCOME_COUNTER: Partial<Record<string, keyof BoxScore>> = {
  goal: "goals",
  shot_missed: "shots_missed",
  shot_saved: "shots_saved",
  assist: "assists",
  technical_fault: "technical_faults",
  steal: "steals",
  block: "blocks",
  suspension_created: "suspensions_created",
  suspension_received: "suspensions_received",
  big_mistake: "big_mistakes",
}

/** shot_origin -> the counter it increments, independent of outcome. */
const ORIGIN_COUNTER: Partial<Record<string, keyof BoxScore>> = {
  nine_m: "nine_m_shots",
  breakthrough: "breakthroughs",
}

/**
 * Mirrors the `match_box_score` SQL view exactly.
 *
 * Duplicating the derivation in TS is deliberate: the review UI needs live
 * counts while tagging without a round-trip, and since the test suite is pure
 * functions only (no DB harness), this is the only expression of the rule that
 * can actually be tested. The two must agree - the verification query shipped
 * with the backfill migration is what checks that.
 */
export function deriveBoxScore(events: readonly MatchEventLike[]): BoxScore {
  const score: BoxScore = { ...EMPTY_BOX_SCORE }

  for (const event of events) {
    const outcome = OUTCOME_COUNTER[event.event_type]
    if (outcome) score[outcome] += 1

    // Applies to every shot regardless of how it ended, which is what preserves
    // the legacy semantics of nine_m_shots / breakthroughs.
    if (event.shot_origin) {
      const origin = ORIGIN_COUNTER[event.shot_origin]
      if (origin) score[origin] += 1
    }
  }

  return score
}

export interface RunningScore {
  us: number
  them: number
}

/** The three event types that move the scoreboard. */
export const SCORING_EVENTS: ReadonlySet<string> = new Set([
  "goal",
  "team_goal",
  "opponent_goal",
])

/**
 * The score, counted from the events themselves.
 *
 * This replaces a stored snapshot. Each event used to carry score_us/score_them
 * as tagged, and the box-score view took MAX() over them - which meant an
 * opponent goal after your last tagged event was never recorded at all, and
 * deleting a goal you had tagged left the score stuck at its old high-water
 * mark, because a maximum cannot go down.
 *
 * Counting instead makes both cases fall out for free, and is the same shape as
 * every other counter in the box score.
 */
export function deriveScore(events: readonly MatchEventLike[]): RunningScore {
  let us = 0
  let them = 0
  for (const event of events) {
    // `goal` is yours and `team_goal` is a teammate's; both move the scoreboard,
    // but only the first feeds your box score.
    if (event.event_type === "goal" || event.event_type === "team_goal") us += 1
    else if (event.event_type === "opponent_goal") them += 1
  }
  return { us, them }
}

/** Palette key -> event type, for the keyboard handler. Built once. */
export const EVENT_TYPE_BY_KEY: Record<string, MatchEventType> = Object.fromEntries(
  PALETTE_EVENT_TYPES.map((type) => [EVENT_META[type].key, type])
)

/** Digits 1-7 set the shot origin on the active event. */
export const SHOT_ORIGIN_BY_KEY: Record<string, ShotOrigin> = Object.fromEntries(
  SHOT_ORIGINS.map((origin, index) => [String(index + 1), origin])
)
