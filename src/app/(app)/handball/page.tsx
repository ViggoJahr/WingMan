import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { MatchBoxScoreChart, type MatchBoxScorePoint } from "./chart"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default async function HandballPage() {
  const supabase = await createClient()

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "session_id, opponent, is_home, opposition_difficulty, goals, assists, steals, technical_faults"
    )
    .order("session_id", { ascending: true })

  const { data: practices } = await supabase
    .from("team_practices")
    .select("session_id, practice_focus, tactical_complexity")

  const sessionIds = [
    ...(matches ?? []).map((m) => m.session_id),
    ...(practices ?? []).map((p) => p.session_id),
  ]

  const { data: sessions } = sessionIds.length
    ? await supabase
        .from("sessions")
        .select("id, start_time, rpe")
        .in("id", sessionIds)
    : { data: [] }

  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]))

  const matchRows = (matches ?? [])
    .map((m) => ({ ...m, session: sessionById.get(m.session_id) }))
    .filter((m) => m.session)
    .sort((a, b) => a.session!.start_time.localeCompare(b.session!.start_time))

  const practiceRows = (practices ?? [])
    .map((p) => ({ ...p, session: sessionById.get(p.session_id) }))
    .filter((p) => p.session)
    .sort((a, b) => b.session!.start_time.localeCompare(a.session!.start_time))

  const chartData: MatchBoxScorePoint[] = matchRows.map((m) => ({
    label: `${formatDate(m.session!.start_time)}${m.opponent ? ` vs ${m.opponent}` : ""}`,
    goals: m.goals ?? 0,
    assists: m.assists ?? 0,
    steals: m.steals ?? 0,
    technical_faults: m.technical_faults ?? 0,
  }))

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Handball</h1>
          <p className="text-muted-foreground">Match performance and practice history.</p>
        </div>

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
            {matchRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-4">Date</th>
                      <th className="py-1 pr-4">Opponent</th>
                      <th className="py-1 pr-4">Home/Away</th>
                      <th className="py-1 pr-4">Difficulty</th>
                      <th className="py-1 pr-4">G</th>
                      <th className="py-1 pr-4">A</th>
                      <th className="py-1 pr-4">Steals</th>
                      <th className="py-1">Faults</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {matchRows.map((m) => (
                      <tr key={m.session_id}>
                        <td className="py-1 pr-4">{formatDate(m.session!.start_time)}</td>
                        <td className="py-1 pr-4">{m.opponent ?? "-"}</td>
                        <td className="py-1 pr-4">{m.is_home ? "Home" : "Away"}</td>
                        <td className="py-1 pr-4">{m.opposition_difficulty ?? "-"}</td>
                        <td className="py-1 pr-4">{m.goals}</td>
                        <td className="py-1 pr-4">{m.assists}</td>
                        <td className="py-1 pr-4">{m.steals}</td>
                        <td className="py-1">{m.technical_faults}</td>
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
            {practiceRows.length > 0 ? (
              <ul className="flex flex-col divide-y text-sm">
                {practiceRows.map((p) => (
                  <li key={p.session_id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">{p.practice_focus ?? "Practice"}</p>
                      <p className="text-muted-foreground">{formatDate(p.session!.start_time)}</p>
                    </div>
                    <div className="text-right text-muted-foreground">
                      {p.tactical_complexity != null && <p>Complexity {p.tactical_complexity}</p>}
                      {p.session!.rpe != null && <p>RPE {p.session!.rpe}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No practices logged yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
