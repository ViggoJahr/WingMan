import Link from "next/link"
import { sessionTypeLabel, sourceLabel } from "@/lib/labels"

export interface SessionRowData {
  id: string
  type: string
  start_time: string
  rpe: number | null
  calories_kcal: number | null
  external_source: string | null
  cardio_sessions: { focus: string | null; avg_hr: number | null } | null
  strength_sessions: { focus: string | null } | null
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function SessionRow({ session }: { session: SessionRowData }) {
  const focus = session.cardio_sessions?.focus ?? session.strength_sessions?.focus

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="flex items-center justify-between py-2 text-sm hover:bg-accent"
    >
      <div>
        <p className="font-medium">
          {focus ?? sessionTypeLabel(session.type)}
          {session.external_source && (
            <span className="ml-2 text-xs text-muted-foreground">
              via {sourceLabel(session.external_source)}
            </span>
          )}
        </p>
        <p className="text-muted-foreground">{formatDateTime(session.start_time)}</p>
      </div>
      <div className="text-right text-muted-foreground">
        {session.calories_kcal != null && <p>{session.calories_kcal} kcal</p>}
        {session.rpe != null && <p>RPE {session.rpe}</p>}
      </div>
    </Link>
  )
}

export function SessionList({
  sessions,
  emptyMessage = "No sessions logged yet.",
}: {
  sessions: SessionRowData[]
  emptyMessage?: string
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <ul className="flex flex-col divide-y">
      {sessions.map((s) => (
        <li key={s.id}>
          <SessionRow session={s} />
        </li>
      ))}
    </ul>
  )
}
