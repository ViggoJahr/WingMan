// Controlled vocabulary for the injuries table, kept free of React so the Zod
// schema, the server action and both screens read the same values - the same
// arrangement as lib/handball/vocab.ts.
//
// `type` and `grade` are plain varchar in the database with no CHECK, because
// the table predates this repo. These lists are therefore the only thing
// keeping them consistent; validate against them rather than trusting input.

/** Where it hurts. Ordered head-down, so the list is scannable. */
export const INJURY_SITES = [
  "head",
  "neck",
  "shoulder",
  "elbow",
  "wrist",
  "hand_finger",
  "back",
  "abdomen",
  "hip_groin",
  "hamstring",
  "quad",
  "knee",
  "calf",
  "achilles",
  "ankle",
  "foot",
  "other",
] as const

export type InjurySite = (typeof INJURY_SITES)[number]

export const INJURY_SITE_LABELS: Record<InjurySite, string> = {
  head: "Head",
  neck: "Neck",
  shoulder: "Shoulder",
  elbow: "Elbow",
  wrist: "Wrist",
  hand_finger: "Hand / finger",
  back: "Back",
  abdomen: "Abdomen",
  hip_groin: "Hip / groin",
  hamstring: "Hamstring",
  quad: "Quad",
  knee: "Knee",
  calf: "Calf",
  achilles: "Achilles",
  ankle: "Ankle",
  foot: "Foot",
  other: "Other",
}

/**
 * Severity as AVAILABILITY, not as a clinical grade.
 *
 * "Grade 2 hamstring strain" is a diagnosis, and self-reporting one is
 * guesswork. What you can always answer honestly is whether you trained, and
 * that is also the thing the load charts need in order to explain a gap.
 */
export const INJURY_GRADES = ["niggle", "limited", "out"] as const

export type InjuryGrade = (typeof INJURY_GRADES)[number]

export const INJURY_GRADE_LABELS: Record<InjuryGrade, string> = {
  niggle: "Niggle - trained as normal",
  limited: "Limited - modified training",
  out: "Out - could not train",
}

/** Short form for chips and table cells. */
export const INJURY_GRADE_SHORT: Record<InjuryGrade, string> = {
  niggle: "Niggle",
  limited: "Limited",
  out: "Out",
}

/** Status tone, so a niggle does not shout as loudly as a lay-off. */
export const INJURY_GRADE_TONE: Record<InjuryGrade, string> = {
  niggle: "text-status-warning",
  limited: "text-status-warning",
  out: "text-status-critical",
}

export function injurySiteLabel(site: string | null): string {
  if (!site) return "Unspecified"
  return INJURY_SITE_LABELS[site as InjurySite] ?? site
}

export function injuryGradeLabel(grade: string | null): string | null {
  if (!grade) return null
  return INJURY_GRADE_SHORT[grade as InjuryGrade] ?? grade
}

/**
 * Whole days an injury has lasted, counting both endpoints - so something
 * logged and cleared on the same day is 1 day, not 0.
 *
 * Floors rather than rounds: while an injury is open the end is *now*, and
 * rounding a part-day up made an injury logged this morning read as 2 days.
 */
export function injuryDurationDays(
  injuredDate: string,
  clearedDate: string | null,
  now: Date = new Date()
): number {
  const start = new Date(`${injuredDate}T00:00:00`)
  const end = clearedDate ? new Date(`${clearedDate}T00:00:00`) : now
  const elapsed = Math.floor((end.getTime() - start.getTime()) / 86_400_000)
  return Math.max(1, elapsed + 1)
}
