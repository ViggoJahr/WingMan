import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PageShell } from "@/components/PageShell"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/dates"
import { fetchMatches, fetchPractices, throwLoad } from "@/lib/services/handball"
import { POSITION_LABELS, throwBandLabel, type HandballPosition } from "@/lib/handball/vocab"
import { MatchBoxScoreChart, type MatchBoxScorePoint } from "./chart"

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
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Last 7 days</dt>
                <dd className="text-2xl font-semibold tabular-nums">{throws7d}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last 28 days</dt>
                <dd className="text-2xl font-semibold tabular-nums">{throws28d}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
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
          {matches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-4">Date</th>
                    <th className="py-1 pr-4">Opponent</th>
                    <th className="py-1 pr-4">H/A</th>
                    <th className="py-1 pr-4">G</th>
                    <th className="py-1 pr-4">A</th>
                    <th className="py-1 pr-4">9m</th>
                    <th className="py-1 pr-4">Brk</th>
                    <th className="py-1 pr-4">Steals</th>
                    <th className="py-1 pr-4">Faults</th>
                    <th className="py-1">Clips</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {matches.map((m) => (
                    <tr key={m.session_id}>
                      <td className="py-1 pr-4">
                        <Link
                          href={`/sessions/${m.session_id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {formatDate(m.start_time!)}
                        </Link>
                      </td>
                      <td className="py-1 pr-4">{m.opponent ?? "-"}</td>
                      <td className="py-1 pr-4">{m.is_home ? "H" : "A"}</td>
                      <td className="py-1 pr-4 tabular-nums">{m.goals}</td>
                      <td className="py-1 pr-4 tabular-nums">{m.assists}</td>
                      <td className="py-1 pr-4 tabular-nums">{m.nine_m_shots}</td>
                      <td className="py-1 pr-4 tabular-nums">{m.breakthroughs}</td>
                      <td className="py-1 pr-4 tabular-nums">{m.steals}</td>
                      <td className="py-1 pr-4 tabular-nums">{m.technical_faults}</td>
                      <td className="py-1 tabular-nums text-muted-foreground">
                        {m.clipped_events! > 0 ? (
                          <Link
                            href={`/sessions/${m.session_id}/review`}
                            className="underline-offset-2 hover:underline"
                          >
                            {m.clipped_events}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No matches logged yet.</p>
          )}
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
                <li key={p.session_id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{p.practice_focus ?? "Practice"}</p>
                    <p className="text-muted-foreground">
                      {formatDate(p.start_time)}
                      {p.position &&
                        ` - ${POSITION_LABELS[p.position as HandballPosition] ?? p.position}`}
                    </p>
                  </div>
                  <div className="text-right text-muted-foreground">
                    {throwBandLabel(p.throws_count) && <p>{throwBandLabel(p.throws_count)}</p>}
                    {p.rpe != null && <p>RPE {p.rpe}</p>}
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
