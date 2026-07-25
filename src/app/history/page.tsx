import Link from "next/link"
import { Nav } from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SessionList, type SessionRowData } from "@/components/SessionRow"
import { createClient } from "@/lib/supabase/server"

const PAGE_SIZE = 30

const SESSION_TYPES = ["strength_power", "cardio", "mobility_rehab", "active_rest", "handball"] as const

interface Filters {
  type?: string
  source?: string
  from?: string
  to?: string
  page?: string
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Filters> }) {
  const { type, source, from, to, page: pageParam } = await searchParams
  const supabase = await createClient()
  const page = Math.max(0, Number(pageParam ?? 0))

  let query = supabase
    .from("sessions")
    .select(
      "id, type, start_time, rpe, calories_kcal, external_source, cardio_sessions(focus, avg_hr), strength_sessions(focus)"
    )
    .is("merged_into", null)
    .order("start_time", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  if (type) query = query.eq("type", type as (typeof SESSION_TYPES)[number])
  if (source === "manual") query = query.is("external_source", null)
  else if (source === "tugg" || source === "google_health") query = query.eq("external_source", source)
  if (from) query = query.gte("start_time", new Date(from).toISOString())
  if (to) query = query.lte("start_time", new Date(new Date(to).getTime() + 86_400_000).toISOString())

  const { data: rows } = await query
  const hasNext = (rows ?? []).length > PAGE_SIZE
  const sessions = (rows ?? []).slice(0, PAGE_SIZE).map((s) => ({
    ...s,
    cardio_sessions: s.cardio_sessions as unknown as SessionRowData["cardio_sessions"],
    strength_sessions: s.strength_sessions as unknown as SessionRowData["strength_sessions"],
  }))

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
    <div className="flex flex-col">
      <Nav />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">History</h1>
          <p className="text-muted-foreground">Every logged session, filterable.</p>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <label htmlFor="type">Type</label>
            <select id="type" name="type" defaultValue={type ?? ""} className="h-9 rounded-md border bg-background px-2">
              <option value="">All</option>
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="source">Source</label>
            <select
              id="source"
              name="source"
              defaultValue={source ?? ""}
              className="h-9 rounded-md border bg-background px-2"
            >
              <option value="">All</option>
              <option value="manual">Manual</option>
              <option value="tugg">TUGG</option>
              <option value="google_health">Google Health</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="from">From</label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={from ?? ""}
              className="h-9 rounded-md border bg-background px-2"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="to">To</label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={to ?? ""}
              className="h-9 rounded-md border bg-background px-2"
            />
          </div>
          <button type="submit" className="h-9 rounded-md border bg-secondary px-3 text-secondary-foreground">
            Filter
          </button>
          {(type || source || from || to) && (
            <Link href="/history" className="h-9 content-center underline">
              Clear
            </Link>
          )}
        </form>

        <Card>
          <CardHeader>
            <CardTitle>Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <SessionList sessions={sessions} emptyMessage="No sessions match these filters." />
          </CardContent>
        </Card>

        <div className="flex justify-between text-sm">
          {page > 0 ? (
            <Link href={pageLink(page - 1)} className="underline">
              Previous
            </Link>
          ) : (
            <span />
          )}
          {hasNext && (
            <Link href={pageLink(page + 1)} className="underline">
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
