import type { ReactNode } from "react"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { PracticeForm } from "@/app/(app)/log/practice/PracticeForm"
import { MatchForm } from "@/app/(app)/log/match/MatchForm"
import { WorkoutForm } from "@/app/(app)/log/workout/WorkoutForm"

function toDatetimeLocal(iso: string) {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function durationMinutes(start: string, end: string | null) {
  if (!end) return 60
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000)
}

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from("sessions")
    .select("id, type, start_time, end_time, rpe, location, external_source, merged_into")
    .eq("id", id)
    .maybeSingle()

  if (!session) notFound()
  // Synced or merged-away sessions aren't editable - bounce to the view page.
  if (session.merged_into) redirect(`/sessions/${session.merged_into}`)
  if (session.external_source !== null) redirect(`/sessions/${id}`)

  let title = "Edit session"
  let form: ReactNode

  if (session.type === "handball") {
    const { data: handball } = await supabase
      .from("handball_sessions")
      .select(
        "subtype, defense_vs_attack_ratio, comments, perceived_performance, perceived_challenge, throws_count, jump_load, contact_load, position"
      )
      .eq("session_id", id)
      .maybeSingle()

    if (handball?.subtype === "match") {
      const [{ data: match }, { count }] = await Promise.all([
        supabase.from("matches").select("*").eq("session_id", id).maybeSingle(),
        supabase
          .from("match_events")
          .select("id", { count: "exact", head: true })
          .eq("session_id", id),
      ])
      if (!match) notFound()
      title = "Edit match"
      form = (
        <MatchForm
          mode="edit"
          sessionId={id}
          eventCount={count ?? 0}
          defaultValues={{
            start_time: toDatetimeLocal(session.start_time),
            opponent: match.opponent,
            is_home: match.is_home ?? true,
            location: session.location,
            play_time_min: match.play_time_min,
            minutes_period_1: match.minutes_period_1,
            minutes_period_2: match.minutes_period_2,
            plus_minus: match.plus_minus,
            importance: match.importance,
            opposition_difficulty: match.opposition_difficulty,
            perceived_performance: handball.perceived_performance,
            perceived_challenge: handball.perceived_challenge,
            rpe: session.rpe,
            comments: handball.comments,
          }}
        />
      )
    } else {
      const { data: practice } = await supabase
        .from("team_practices")
        .select("*")
        .eq("session_id", id)
        .maybeSingle()
      if (!practice) notFound()
      title = "Edit practice"
      form = (
        <PracticeForm
          mode="edit"
          sessionId={id}
          defaultValues={{
            start_time: toDatetimeLocal(session.start_time),
            duration_minutes: durationMinutes(session.start_time, session.end_time),
            location: session.location,
            rpe: session.rpe,
            practice_focus: practice.practice_focus,
            defense_vs_attack_ratio: handball?.defense_vs_attack_ratio ?? null,
            tactical_complexity: practice.tactical_complexity,
            comments: handball?.comments ?? null,
            throws_count: handball?.throws_count ?? null,
            jump_load: handball?.jump_load ?? null,
            contact_load: handball?.contact_load ?? null,
            position: handball?.position ?? null,
            perceived_performance: handball?.perceived_performance ?? null,
          }}
        />
      )
    }
  } else {
    const [{ data: cardio }, { data: strength }] = await Promise.all([
      supabase.from("cardio_sessions").select("focus, distance_m").eq("session_id", id).maybeSingle(),
      supabase.from("strength_sessions").select("focus").eq("session_id", id).maybeSingle(),
    ])
    title = "Edit workout"
    form = (
      <WorkoutForm
        mode="edit"
        sessionId={id}
        defaultValues={{
          type: session.type,
          focus: cardio?.focus ?? strength?.focus ?? null,
          start_time: toDatetimeLocal(session.start_time),
          duration_minutes: durationMinutes(session.start_time, session.end_time),
          distance_km: cardio?.distance_m != null ? cardio.distance_m / 1000 : null,
          rpe: session.rpe,
          location: session.location,
        }}
      />
    )
  }

  return (
    <div className="flex justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>{form}</CardContent>
        </Card>
      </div>
  )
}
