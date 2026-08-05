import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PageShell } from "@/components/PageShell"
import { Stat, StatGrid } from "@/components/metrics/StatGrid"
import { DataTable, type DataColumn } from "@/components/DataTable"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/dates"
import { fetchMatches, fetchPractices, throwLoad } from "@/lib/services/handball"
import { POSITION_LABELS, throwBandLabel, type HandballPosition } from "@/lib/handball/vocab"
import { MatchBoxScoreChart, type MatchBoxScorePoint } from "./chart"

/**
 * Declared at module scope so the descriptor array is not rebuilt per render,
 * and so the shape stays obvious: these cross the server/client boundary, which
 * is why `href` is a template string rather than a render function.
 */
const MATCH_COLUMNS: readonly DataColumn[] = [
  { key: "start_time", header: "Date", href: "/sessions/{session_id}" },
  { key: "opponent", header: "Opponent", emptyText: "-" },
  { key: "venue", header: "H/A" },
  { key: "goals", header: "G", align: "right" },
  { key: "assists", header: "A", align: "right" },
  { key: "nine_m_shots", header: "9m", align: "right" },
  { key: "breakthroughs", header: "Brk", align: "right" },
  { key: "steals", header: "Steals", align: "right" },
  { key: "technical_faults", header: "Faults", align: "right" },
  {
    key: "clipped_events",
    header: "Clips",
    align: "right",
    href: "/sessions/{session_id}/review",
    emptyText: "-",
  },
]

export default async function HandballPage() {
  const supabase = await createClient()
  const [matches, practices] = await Promise.all([
    fetchMatches(supabase),
    fetchPractices(supabase),
  ])

  // Chart reads oldest-first so the trend runs left to right.
  const chartData: MatchBoxScorePoint[] = [...matches]
    .reverse()
    .map((m) => ({
      label: `${formatDate(m.start_time!)}${m.opponent ? ` vs ${m.opponent}` : ""}`,
      goals: m.goals ?? 0,
      assists: m.assists ?? 0,
      steals: m.steals ?? 0,
      technical_faults: m.technical_faults ?? 0,
    }))

  const throws7d = throwLoad(practices, 7)
  const throws28d = throwLoad(practices, 28)

  return (
    <PageShell>
      <PageHeader title="Handball" description="Match performance and practice history." />

      {throws28d > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Throwing volume</CardTitle>
          </CardHeader>
          <CardContent>
            <StatGrid className="grid-cols-2 sm:grid-cols-2">
              <Stat
                label="Last 7 days"
                value={<span className="text-3xl">{throws7d}</span>}
              />
              <Stat
                label="Last 28 days"
                value={<span className="text-3xl">{throws28d}</span>}
              />
            </StatGrid>
            <p className="mt-3 text-xs text-muted-foreground">
              Estimated throws, from the band picked when logging. Shoulder load is a volume
              problem, so the 7-day number matters more than any single session.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Box score trend</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <MatchBoxScoreChart data={chartData} />
          ) : (
            <p className="text-sm text-muted-foreground">No matches logged yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match history</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            exportName="match-history"
            initialSort="start_time"
            emptyMessage="No matches logged yet."
            caption="Match history with box score counters"
            columns={MATCH_COLUMNS}
            rows={matches.map((m) => ({
              id: m.session_id!,
              session_id: m.session_id!,
              start_time: formatDate(m.start_time!),
              opponent: m.opponent,
              venue: m.is_home ? "H" : "A",
              goals: m.goals,
              assists: m.assists,
              nine_m_shots: m.nine_m_shots,
              breakthroughs: m.breakthroughs,
              steals: m.steals,
              technical_faults: m.technical_faults,
              clipped_events: m.clipped_events,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Practice history</CardTitle>
        </CardHeader>
        <CardContent>
          {practices.length > 0 ? (
            <ul className="flex flex-col divide-y text-sm">
              {practices.map((p) => (
                <li key={p.session_id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.practice_focus ?? "Practice"}</p>
                    <p className="truncate text-muted-foreground">
                      {formatDate(p.start_time)}
                      {p.position &&
                        ` - ${POSITION_LABELS[p.position as HandballPosition] ?? p.position}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {throwBandLabel(p.throws_count) && (
                      <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-xs text-muted-foreground">
                        {throwBandLabel(p.throws_count)}
                      </span>
                    )}
                    {p.rpe != null && (
                      <span className="rounded-full bg-brand-muted px-2.5 py-1 text-xs font-medium text-brand tabular-nums">
                        RPE {p.rpe}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No practices logged yet.</p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
