// Display names for the two enum-ish columns that surface on nearly every
// screen. Both maps were previously redeclared in four files apiece, which is
// how /history ended up showing raw "strength_power" slugs in its filter while
// every other screen said "Strength".
//
// Kept free of React so server pages, client components and the session list
// can all read the same table.

/** Every sessions.type the app knows about, in the order menus should list them. */
export const SESSION_TYPES = [
  "strength_power",
  "cardio",
  "general_cardio",
  "mobility_rehab",
  "active_rest",
  "handball",
] as const

export type SessionType = (typeof SESSION_TYPES)[number]

/** sessions.type -> what to call it. */
export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  strength_power: "Strength",
  cardio: "Cardio",
  general_cardio: "Other activity",
  mobility_rehab: "Mobility/Rehab",
  active_rest: "Active rest",
  handball: "Handball",
}

/**
 * The subset the workout form offers. `handball` has its own dedicated practice
 * and match forms, and `general_cardio` is the sync layer's "unclassified"
 * bucket - neither is something you would pick by hand.
 */
export const MANUAL_WORKOUT_TYPES = [
  "cardio",
  "strength_power",
  "mobility_rehab",
  "active_rest",
] as const satisfies readonly SessionType[]

/** Narrows an untrusted string (a query param) to a known type, or null. */
export function toSessionType(value: string | undefined): SessionType | null {
  return SESSION_TYPES.find((type) => type === value) ?? null
}

/** integration_accounts.source / sessions.external_source -> what to call it. */
export const SOURCE_LABEL: Record<string, string> = {
  tugg: "TUGG",
  google_health: "Google Health",
}

/** Falls back to the raw value, so an unmapped slug shows rather than blanking. */
export function sessionTypeLabel(type: string): string {
  return SESSION_TYPE_LABEL[type as SessionType] ?? type
}

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source
}
