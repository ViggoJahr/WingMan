import Link from "next/link"
import { SessionMonthGroups, type SessionRowData } from "@/components/SessionRow"
import { Pagination, pageParam, paginationRange, splitPage } from "@/components/Pagination"
import { createClient } from "@/lib/supabase/server"
import { SESSION_TYPES, sessionTypeLabel, sourceLabel, toSessionType } from "@/lib/labels"
import { PageHeader, PageShell } from "@/components/PageShell"

const PAGE_SIZE = 30

/** Shared by the four filter controls, which previously each carried their own
 *  copy of the same border/height/padding and had already drifted apart. */
const FIELD =
  "h-9 rounded-lg bg-surface-sunken px-2.5 text-sm ring-1 ring-foreground/10 focus:ring-2 focus:ring-brand focus:outline-none"

interface Filters {
  type?: string
  source?: string
  from?: string
  to?: string
  page?: string
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { type, source, from, to, page: rawPage } = await searchParams
  const supabase = await createClient()
  const page = pageParam(rawPage)

  let query = supabase
    .from("sessions")
    .select(
      "id, type, start_time, rpe, calories_kcal, external_source, cardio_sessions(focus, avg_hr), strength_sessions(focus)"
    )
    .is("merged_into", null)
    .order("start_time", { ascending: false })
    .range(...paginationRange(page, PAGE_SIZE))

  // Narrowed rather than cast, so a hand-edited ?type= that matches nothing is
  // ignored instead of being sent to Postgres as an invalid enum value.
  const typeFilter = toSessionType(type)
  if (typeFilter) query = query.eq("type", typeFilter)
  if (source === "manual") query = query.is("external_source", null)
  else if (source === "tugg" || source === "google_health")
    query = query.eq("external_source", source)
  if (from) query = query.gte("start_time", new Date(from).toISOString())
  if (to) query = query.lte("start_time", new Date(new Date(to).getTime() + 86_400_000).toISOString())

  const { data: rows } = await query
  const { items, hasNext } = splitPage(rows, PAGE_SIZE)
  const sessions = items.map((s) => ({
    ...s,
    cardio_sessions: s.cardio_sessions as unknown as SessionRowData["cardio_sessions"],
    strength_sessions: s.strength_sessions as unknown as SessionRowData["strength_sessions"],
  }))

  const hasFilters = Boolean(type || source || from || to)

  function pageLink(newPage: number) {
    const params = new URLSearchParams()
    if (type) params.set("type", type)
    if (source) params.set("source", source)
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (newPage > 0) params.set("page", String(newPage))
    const qs = params.toString()
    return qs ? `/history?${qs}` : "/history"
  }

  return (
    <PageShell>
      <PageHeader title="History" description="Every logged session, filterable." />

      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="text-xs text-muted-foreground">
            Type
          </label>
          <select id="type" name="type" defaultValue={type ?? ""} className={FIELD}>
            <option value="">All</option>
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {sessionTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="source" className="text-xs text-muted-foreground">
            Source
          </label>
          <select id="source" name="source" defaultValue={source ?? ""} className={FIELD}>
            <option value="">All</option>
            <option value="manual">Manual</option>
            <option value="tugg">{sourceLabel("tugg")}</option>
            <option value="google_health">{sourceLabel("google_health")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="from" className="text-xs text-muted-foreground">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={from ?? ""} className={FIELD} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="to" className="text-xs text-muted-foreground">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={to ?? ""} className={FIELD} />
        </div>
        <button
          type="submit"
          className="h-9 rounded-lg bg-primary px-4 font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Filter
        </button>
        {hasFilters && (
          <Link
            href="/history"
            className="h-9 content-center text-muted-foreground underline hover:text-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      <SessionMonthGroups sessions={sessions} emptyMessage="No sessions match these filters." />

      <Pagination page={page} hasNext={hasNext} hrefFor={pageLink} />
    </PageShell>
  )
}
