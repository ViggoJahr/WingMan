import { z } from "zod"
import { HANDBALL_POSITIONS } from "@/lib/handball/vocab"
import {
  EVENT_SOURCES,
  MATCH_EVENT_TYPES,
  MATCH_PHASES,
  SHOT_ORIGINS,
} from "@/lib/handball/events"

// FormData only ever yields strings, and an untouched optional input arrives
// as "". Before these schemas existed the actions did `Number(formData.get(x))`
// directly, so a blank field became NaN, flowed into `new Date(NaN)` and blew
// up on .toISOString() - or silently wrote NaN into the database.

const emptyToNull = (value: unknown) => (value === "" || value == null ? null : value)

const optionalText = z.preprocess(emptyToNull, z.string().trim().min(1).nullable())

function optionalInt(min: number, max: number) {
  return z.preprocess(emptyToNull, z.coerce.number().int().min(min).max(max).nullable())
}

function optionalDecimal(min: number, max: number) {
  return z.preprocess(emptyToNull, z.coerce.number().min(min).max(max).nullable())
}

function requiredInt(min: number, max: number) {
  return z.coerce.number().int().min(min).max(max)
}

/** Value of an <input type="datetime-local">, e.g. "2026-07-25T18:30". */
const localDateTime = z
  .string()
  .min(1, "Start time is required")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Not a valid date and time")

/** Value of an <input type="date">. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Not a valid date")
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Not a valid date")

/** Unchecked checkboxes are absent from FormData entirely. */
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean())

// RPE is constrained to 1-20 by a CHECK constraint on sessions; the 1-10
// scales below match the CHECK constraints on their own tables.
const rpe = optionalInt(1, 20)

const sessionCore = {
  start_time: localDateTime,
  duration_minutes: z.coerce
    .number()
    .int()
    .min(1, "Duration must be at least 1 minute")
    .max(1440, "Duration can't exceed 24 hours"),
  rpe,
  location: optionalText,
}

/** Position is a controlled vocabulary; the CHECK on handball_sessions matches. */
const handballPosition = z.preprocess(emptyToNull, z.enum(HANDBALL_POSITIONS).nullable())

export const practiceSchema = z.object({
  ...sessionCore,
  practice_focus: optionalText,
  defense_vs_attack_ratio: optionalText,
  tactical_complexity: optionalInt(1, 10),
  comments: optionalText,
  // Tissue-specific dose. The form writes band midpoints for throws (0/15/55/110)
  // and 0-3 bands for the other two; 400 is a generous ceiling for a hand-edited
  // throws value rather than a real training limit.
  throws_count: optionalInt(0, 400),
  jump_load: optionalInt(0, 3),
  contact_load: optionalInt(0, 3),
  position: handballPosition,
  perceived_performance: optionalInt(1, 10),
})

export const WORKOUT_TYPES = ["cardio", "strength_power", "mobility_rehab", "active_rest"] as const
export type WorkoutType = (typeof WORKOUT_TYPES)[number]

export const workoutUpdateSchema = z.object({
  ...sessionCore,
  focus: optionalText,
  distance_km: optionalDecimal(0, 1000),
})

export const workoutSchema = workoutUpdateSchema.extend({
  type: z.enum(WORKOUT_TYPES),
})

export const matchSchema = z.object({
  start_time: localDateTime,
  play_time_min: optionalInt(0, 200),
  rpe,
  location: optionalText,
  opponent: optionalText,
  is_home: checkbox,
  comments: optionalText,
  perceived_performance: optionalInt(1, 10),
  perceived_challenge: optionalInt(1, 10),
  importance: optionalInt(1, 10),
  opposition_difficulty: optionalInt(1, 10),
  // The 12 box-score counters used to live here. They are now derived by
  // counting match_events (see the match_box_score view), so the form no longer
  // collects them and nothing writes the columns.
})

export const readinessSchema = z.object({
  date: isoDate,
  notes: optionalText,
  training_load: requiredInt(0, 10),
  muscle_soreness: requiredInt(0, 10),
  mental_stress: requiredInt(0, 10),
  current_injury: requiredInt(0, 10),
  current_illness: requiredInt(0, 10),
  sleep_quality: requiredInt(0, 10),
  food_beverage: requiredInt(0, 10),
  mood: requiredInt(0, 10),
  recovery_energy: requiredInt(0, 10),
})

// The review UI sends plain objects over a typed server action rather than
// FormData, so these need none of the emptyToNull coercion above - the client
// already holds real numbers and nulls. `id` is minted client-side so every
// write can be an idempotent upsert; see the review actions.
const nullableNumber = z.number().finite().nullable().optional()

export const matchEventSchema = z.object({
  id: z.uuid(),
  session_id: z.uuid(),
  video_id: z.uuid().nullable().optional(),
  event_type: z.enum(MATCH_EVENT_TYPES),
  shot_origin: z.enum(SHOT_ORIGINS).nullable().optional(),
  phase: z.enum(MATCH_PHASES).nullable().optional(),
  video_offset_seconds: z.number().finite().min(0).nullable().optional(),
  period: z.number().int().min(1).max(4).nullable().optional(),
  clock_seconds: z.number().int().min(0).nullable().optional(),
  score_us: z.number().int().min(0).max(200).nullable().optional(),
  score_them: z.number().int().min(0).max(200).nullable().optional(),
  position: z.enum(HANDBALL_POSITIONS).nullable().optional(),
  // Metres on the attacking half, origin at the centre of the goal line. See
  // the header of lib/handball/zones.ts for the full convention.
  court_x: nullableNumber,
  court_y: nullableNumber,
  // 1-9 numbered like a numpad (7-8-9 is the top row), 0 = off target. Null
  // still means "not tagged", which is why off-target needed a value of its own.
  goal_cell: z.number().int().min(0).max(9).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  source: z.enum(EVENT_SOURCES).optional(),
})

export const matchVideoSchema = z.object({
  kind: z.enum(["local_file", "url"]),
  label: z.string().trim().max(60).nullable().optional(),
  url: z.string().url().nullable().optional(),
  file_name: z.string().trim().max(400).nullable().optional(),
  file_size_bytes: z.number().int().min(0).nullable().optional(),
  duration_seconds: z.number().finite().min(0).nullable().optional(),
})

export type MatchEventInput = z.infer<typeof matchEventSchema>
export type MatchVideoInput = z.infer<typeof matchVideoSchema>

export type PracticeInput = z.infer<typeof practiceSchema>
export type WorkoutInput = z.infer<typeof workoutSchema>
export type MatchInput = z.infer<typeof matchSchema>
export type ReadinessInput = z.infer<typeof readinessSchema>

/** Sessions store an end_time rather than a duration. */
export function endTimeFrom(startTime: string, durationMinutes: number): string {
  return new Date(new Date(startTime).getTime() + durationMinutes * 60_000).toISOString()
}
