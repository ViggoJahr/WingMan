import { format, parseISO, startOfWeek } from "date-fns"

// Weekly rollup of the daily load series.
//
// This used to recompute load from `sessions.rpe` itself, which made it a
// second, quieter definition of "load" that disagreed with everything else:
// it ignored `manual_rpe` entirely, so every RPE entered by hand was invisible
// here, and it counted a session with no RPE as zero. daily_facts already
// resolves all of that through its tiers (measured -> hr_derived -> assumed),
// so this now only buckets what the view produced.

export interface DailyLoadInput {
  /** Calendar day, yyyy-MM-dd. */
  day: string
  load: number
}

export interface WeeklyLoadPoint {
  /** Monday of the week, yyyy-MM-dd. */
  weekStart: string
  load: number
}

/**
 * Buckets daily load into ISO weeks (Monday start).
 *
 * Days are parsed with `parseISO` rather than `new Date(day)`: the latter reads
 * a date-only string as UTC midnight, which lands on the previous day - and so
 * potentially the previous week - anywhere west of Greenwich.
 */
export function aggregateWeeklyLoad(days: DailyLoadInput[]): WeeklyLoadPoint[] {
  const byWeek = new Map<string, number>()

  for (const { day, load } of days) {
    if (!Number.isFinite(load)) continue
    const weekStart = format(startOfWeek(parseISO(day), { weekStartsOn: 1 }), "yyyy-MM-dd")
    byWeek.set(weekStart, (byWeek.get(weekStart) ?? 0) + load)
  }

  return Array.from(byWeek.entries())
    .map(([weekStart, load]) => ({ weekStart, load: Math.round(load * 10) / 10 }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}
