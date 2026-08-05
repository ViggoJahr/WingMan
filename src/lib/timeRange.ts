/**
 * The 30D / 3M / 6M / 1Y window, shared by the pills and by the queries.
 *
 * Declared here rather than in the pill component because the *server* pages
 * are what actually act on it - the pills only write a search param, and the
 * page reads it back to size its query. Putting the day counts in the client
 * component would mean a page importing a `"use client"` module purely to know
 * that "3m" is 90 days.
 *
 * Kept free of React so a server component, a client component and a test can
 * all read the same list.
 */

export const TIME_RANGES = [
  { key: "30d", label: "30D", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "6m", label: "6M", days: 180 },
  { key: "1y", label: "1Y", days: 365 },
] as const

export type TimeRangeKey = (typeof TIME_RANGES)[number]["key"]

/** What a page shows when nothing is asked for. Matches the reference's default. */
export const DEFAULT_RANGE: TimeRangeKey = "30d"

export function parseRange(value: string | undefined | null): TimeRangeKey {
  const match = TIME_RANGES.find((r) => r.key === value)
  return match ? match.key : DEFAULT_RANGE
}

export function rangeDays(key: TimeRangeKey): number {
  return TIME_RANGES.find((r) => r.key === key)!.days
}

export function rangeLabel(key: TimeRangeKey): string {
  return TIME_RANGES.find((r) => r.key === key)!.label
}

/**
 * How far back to *query* for a given display window.
 *
 * A band needs its own history: showing 30 days against a normal range built
 * from those same 30 days makes today's reading part of the average it is being
 * compared to, which flattens every verdict toward "normal". So the query
 * always reaches back a full baseline window further than the chart displays.
 */
export function fetchDaysFor(key: TimeRangeKey, baselineDays: number): number {
  return rangeDays(key) + baselineDays
}
