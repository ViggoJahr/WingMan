import { format, startOfWeek } from "date-fns"

export interface SessionLoadInput {
  start_time: string
  end_time: string | null
  rpe: number | null
}

// Session-RPE load: perceived effort x duration. Standard sports-science
// proxy for training stress when no power/HR-based metric is available.
export function computeSessionLoad(session: SessionLoadInput): number {
  if (session.rpe == null || !session.end_time) return 0
  const durationHours =
    (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 3_600_000
  if (durationHours <= 0) return 0
  return Math.round(session.rpe * durationHours * 10) / 10
}

export interface WeeklyLoadPoint {
  weekStart: string
  load: number
}

export function aggregateWeeklyLoad(sessions: SessionLoadInput[]): WeeklyLoadPoint[] {
  const byWeek = new Map<string, number>()

  for (const session of sessions) {
    const weekStart = format(startOfWeek(new Date(session.start_time), { weekStartsOn: 1 }), "yyyy-MM-dd")
    const load = computeSessionLoad(session)
    byWeek.set(weekStart, (byWeek.get(weekStart) ?? 0) + load)
  }

  return Array.from(byWeek.entries())
    .map(([weekStart, load]) => ({ weekStart, load: Math.round(load * 10) / 10 }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}
