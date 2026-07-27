// Controlled vocabularies shared by the handball forms, the session detail view
// and (from PR B) the match event taxonomy. Kept free of React so the values can
// be imported by server actions, Zod schemas and client components alike, and so
// the CHECK constraints in the migrations have exactly one TS counterpart.

export const HANDBALL_POSITIONS = [
  "left_wing",
  "left_back",
  "centre_back",
  "right_back",
  "right_wing",
  "pivot",
  "defence",
  "goalkeeper",
] as const

export type HandballPosition = (typeof HANDBALL_POSITIONS)[number]

export const POSITION_LABELS: Record<HandballPosition, string> = {
  left_wing: "Left wing",
  left_back: "Left back",
  centre_back: "Centre back",
  right_back: "Right back",
  right_wing: "Right wing",
  pivot: "Pivot",
  defence: "Defence",
  goalkeeper: "Goalkeeper",
}

// Nobody counts their throws. A band that gets filled in every session is worth
// more than an exact number that gets skipped, so the form offers four bands and
// stores the midpoint of each - midpoints stay summable, which is what a rolling
// 7-day throw count needs. The band is trivially recoverable from the midpoint,
// so there is no second column.
export const THROW_BANDS = [
  { value: 0, label: "None" },
  { value: 15, label: "Few" },
  { value: 55, label: "Normal" },
  { value: 110, label: "Lots" },
] as const

/** Jump/landing and contact exposure. Matches the 0-3 CHECK on handball_sessions. */
export const LOAD_BANDS = [
  { value: 0, label: "None" },
  { value: 1, label: "Some" },
  { value: 2, label: "Lots" },
  { value: 3, label: "Max" },
] as const

export const LOAD_BAND_LABELS = ["None", "Some", "Lots", "Max"] as const

/** Common durations, so the usual case is one tap rather than typing. */
export const PRACTICE_DURATIONS = [60, 75, 90, 120] as const

// Multi-select, comma-joined into team_practices.practice_focus (varchar 255).
// Free text was the slowest field on the form and produced values that could
// never be grouped; an "Other" escape hatch keeps the long tail available.
export const PRACTICE_FOCUS_OPTIONS = [
  "Defence",
  "Positional attack",
  "Counter attack",
  "Shooting",
  "Set plays",
  "Power play",
  "Technique",
  "Match play",
] as const

/** Renders a stored throws_count back to the band label it came from. */
export function throwBandLabel(count: number | null): string | null {
  if (count == null) return null
  const band = THROW_BANDS.find((b) => b.value === count)
  return band ? band.label : `${count} throws`
}

/** Renders a 0-3 band to its label, for the session detail view. */
export function loadBandLabel(value: number | null): string | null {
  if (value == null) return null
  return LOAD_BAND_LABELS[value] ?? null
}
