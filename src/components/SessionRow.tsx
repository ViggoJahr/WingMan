import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/dates"
import {
  DEFAULT_SESSION_ICON,
  SESSION_TYPE_ICON,
  sessionTypeLabel,
  sourceLabel,
  type SessionType,
} from "@/lib/labels"

/**
 * One activity, as a card rather than a table row.
 *
 * The leading tile is doing real work, not decoration: a list of fifteen
 * sessions is scanned for shape ("where were the strength days?") long before
 * any of it is read, and a glyph answers that in one pass where a column of
 * words does not. The RPE badge rides on the tile for the same reason the
 * reference badges its activity icons - it is the one number you want per row.
 */

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

export function SessionRow({ session }: { session: SessionRowData }) {
  const focus = session.cardio_sessions?.focus ?? session.strength_sessions?.focus
  const Icon = SESSION_TYPE_ICON[session.type as SessionType] ?? DEFAULT_SESSION_ICON

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="group/session flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 transition-colors hover:bg-accent"
    >
      <span className="relative shrink-0" aria-hidden>
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-muted text-brand">
          <Icon className="size-5" />
        </span>
        {session.rpe != null && (
          // Overlapping the tile's corner rather than sitting in its own column,
          // so the badge cannot push the title around when it is absent.
          <span className="absolute -right-1 -bottom-1 rounded-md bg-card px-1 text-[10px] leading-4 font-semibold text-brand ring-1 ring-brand/40 tabular-nums">
            {session.rpe}
          </span>
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate font-medium">
          {focus ?? sessionTypeLabel(session.type)}
          {session.external_source && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              via {sourceLabel(session.external_source)}
            </span>
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {formatDateTime(session.start_time)}
          {session.calories_kcal != null && ` - ${session.calories_kcal} kcal`}
        </p>
      </div>

      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/session:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}

export function SessionList({
  sessions,
  emptyMessage = "No sessions logged yet.",
  className,
}: {
  sessions: SessionRowData[]
  emptyMessage?: string
  className?: string
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {sessions.map((s) => (
        <li key={s.id}>
          <SessionRow session={s} />
        </li>
      ))}
    </ul>
  )
}

/**
 * "AUGUST 2026" over a run of rows.
 *
 * The reference groups its activity history by month, which is what makes a
 * long list navigable - dates alone give you nothing to skim against.
 */
export function SessionMonthGroups({
  sessions,
  emptyMessage = "No sessions logged yet.",
}: {
  sessions: SessionRowData[]
  emptyMessage?: string
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  // Preserves the caller's ordering rather than sorting: /history offers both
  // directions, and re-sorting here would silently override the choice.
  const groups: { key: string; label: string; items: SessionRowData[] }[] = []
  for (const session of sessions) {
    const date = new Date(session.start_time)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const last = groups.at(-1)
    if (last?.key === key) {
      last.items.push(session)
      continue
    }
    groups.push({
      key,
      label: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      items: [session],
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <h3 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {group.label}
          </h3>
          <SessionList sessions={group.items} />
        </section>
      ))}
    </div>
  )
}
