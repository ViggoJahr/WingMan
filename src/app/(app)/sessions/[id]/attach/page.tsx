import { notFound, redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader, PageShell } from "@/components/PageShell"
import { createClient } from "@/lib/supabase/server"
import { formatDateTime } from "@/lib/dates"
import { PracticeForm } from "../../../log/practice/PracticeForm"
import { MatchForm } from "../../../log/match/MatchForm"

/**
 * Fills in a handball session the sync detected but knows nothing about.
 *
 * Google Health creates these with subtype 'individual'. Before this the only
 * way to record that one was a team practice was to log a second session by
 * hand, which left a duplicate that sessionMerge cannot resolve - it only
 * merges across differing external sources, and a hand-logged session has none.
 */
export default async function AttachSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ as?: string }>
}) {
  const { id } = await params
  const { as } = await searchParams
  const supabase = await createClient()

  const { data: session } = await supabase
    .from("sessions")
    .select("id, type, start_time, end_time, location, handball_sessions(subtype)")
    .eq("id", id)
    .maybeSingle()

  if (!session || session.type !== "handball") notFound()

  const detail = session.handball_sessions as unknown as { subtype: string } | null
  // Already described - nothing to attach, so send them to the session itself.
  if (detail && detail.subtype !== "individual") redirect(`/sessions/${id}`)

  const kind = as === "match" ? "match" : "practice"

  const durationMinutes = session.end_time
    ? Math.max(
        1,
        Math.round(
          (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 60_000
        )
      )
    : 90

  // The schema wants a datetime-local string; the hidden field only exists to
  // satisfy it, since the attach actions never write start_time.
  const startLocal = new Date(session.start_time).toISOString().slice(0, 16)

  return (
    <PageShell width="narrow">
      <PageHeader
        title={kind === "match" ? "Add match detail" : "Add practice detail"}
        description={`Detected session on ${formatDateTime(session.start_time)}`}
      />
      <Card>
        <CardContent>
          {kind === "match" ? (
            <MatchForm
              mode="attach"
              sessionId={id}
              defaultValues={{
                start_time: startLocal,
                opponent: null,
                is_home: true,
                location: session.location,
                play_time_min: durationMinutes,
                minutes_period_1: null,
                minutes_period_2: null,
                plus_minus: null,
                importance: null,
                opposition_difficulty: null,
                perceived_performance: null,
                perceived_challenge: null,
                rpe: null,
                comments: null,
              }}
            />
          ) : (
            <PracticeForm
              mode="attach"
              sessionId={id}
              defaultValues={{
                start_time: startLocal,
                duration_minutes: durationMinutes,
                location: session.location,
                rpe: null,
                practice_focus: null,
                tactical_complexity: null,
                defense_vs_attack_ratio: null,
                comments: null,
                throws_count: null,
                jump_load: null,
                contact_load: null,
                position: null,
                perceived_performance: null,
              }}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
