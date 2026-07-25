import { notFound, redirect } from "next/navigation"
import { Nav } from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { HeartRateChart } from "./HeartRateChart"

const SESSION_TYPE_LABEL: Record<string, string> = {
  strength_power: "Strength",
  cardio: "Cardio",
  mobility_rehab: "Mobility/Rehab",
  active_rest: "Active rest",
  handball: "Handball",
}

const SOURCE_LABEL: Record<string, string> = {
  tugg: "TUGG",
  google_health: "Google Health",
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function formatDuration(startIso: string, endIso: string | null) {
  if (!endIso) return null
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

function secToMin(seconds: number | null) {
  return seconds != null ? Math.round(seconds / 60) : null
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, type, start_time, end_time, rpe, location, surface, calories_kcal, active_duration_seconds, active_zone_minutes, hr_zones, external_source, merged_into"
    )
    .eq("id", id)
    .maybeSingle()

  if (!session) notFound()
  if (session.merged_into) redirect(`/sessions/${session.merged_into}`)

  const { data: mergedFrom } = await supabase
    .from("sessions")
    .select("id, external_source, calories_kcal, active_duration_seconds")
    .eq("merged_into", id)

  const sourcesInvolved = [session.external_source, ...(mergedFrom ?? []).map((m) => m.external_source)].filter(
    Boolean
  ) as string[]
  const hasGoogleHealthWindow = sourcesInvolved.includes("google_health") && session.end_time

  const [{ data: cardio }, { data: strength }, { data: handball }] = await Promise.all([
    supabase.from("cardio_sessions").select("*").eq("session_id", id).maybeSingle(),
    supabase.from("strength_sessions").select("*").eq("session_id", id).maybeSingle(),
    supabase.from("handball_sessions").select("*").eq("session_id", id).maybeSingle(),
  ])

  let exerciseGroups: Array<{
    exerciseName: string
    sets: Array<{ set_number: number | null; weight_kg: number | null; reps: number | null }>
  }> = []
  if (strength) {
    const { data: sets } = await supabase
      .from("exercise_sets")
      .select("set_number, weight_kg, reps, exercise_id, exercises(name)")
      .eq("session_id", id)
      .order("set_number", { ascending: true })

    const byExercise = new Map<string, { exerciseName: string; sets: typeof exerciseGroups[number]["sets"] }>()
    for (const s of sets ?? []) {
      if (!s.exercise_id) continue
      const name = (s.exercises as unknown as { name: string } | null)?.name ?? "Exercise"
      if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, { exerciseName: name, sets: [] })
      byExercise.get(s.exercise_id)!.sets.push({ set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps })
    }
    exerciseGroups = Array.from(byExercise.values())
  }

  let match = null
  let practice = null
  if (handball) {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from("matches").select("*").eq("session_id", id).maybeSingle(),
      supabase.from("team_practices").select("*").eq("session_id", id).maybeSingle(),
    ])
    match = m
    practice = p
  }

  const duration = formatDuration(session.start_time, session.end_time)
  const hrZones = session.hr_zones as
    | { light_sec: number | null; moderate_sec: number | null; vigorous_sec: number | null; peak_sec: number | null }
    | null

  return (
    <div className="flex flex-col">
      <Nav />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {SESSION_TYPE_LABEL[session.type] ?? session.type}
            {(cardio?.focus || strength?.focus) && ` - ${cardio?.focus ?? strength?.focus}`}
          </h1>
          <p className="text-muted-foreground">{formatDateTime(session.start_time)}</p>
          {sourcesInvolved.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Data from {sourcesInvolved.map((s) => SOURCE_LABEL[s] ?? s).join(" + ")}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              {duration && (
                <div>
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd className="font-medium">{duration}</dd>
                </div>
              )}
              {session.rpe != null && (
                <div>
                  <dt className="text-muted-foreground">RPE</dt>
                  <dd className="font-medium">{session.rpe}</dd>
                </div>
              )}
              {session.calories_kcal != null && (
                <div>
                  <dt className="text-muted-foreground">Calories</dt>
                  <dd className="font-medium">{session.calories_kcal} kcal</dd>
                </div>
              )}
              {session.active_duration_seconds != null && (
                <div>
                  <dt className="text-muted-foreground">Active time</dt>
                  <dd className="font-medium">{secToMin(session.active_duration_seconds)}m</dd>
                </div>
              )}
              {session.active_zone_minutes != null && (
                <div>
                  <dt className="text-muted-foreground">Active zone min</dt>
                  <dd className="font-medium">{session.active_zone_minutes}</dd>
                </div>
              )}
              {cardio?.avg_hr != null && (
                <div>
                  <dt className="text-muted-foreground">Avg HR</dt>
                  <dd className="font-medium">{cardio.avg_hr} bpm</dd>
                </div>
              )}
              {cardio?.distance_m != null && (
                <div>
                  <dt className="text-muted-foreground">Distance</dt>
                  <dd className="font-medium">{(cardio.distance_m / 1000).toFixed(2)} km</dd>
                </div>
              )}
              {session.location && (
                <div>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="font-medium">{session.location}</dd>
                </div>
              )}
            </dl>

            {hrZones && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-sm font-medium">Heart-rate zones (minutes)</p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Light {secToMin(hrZones.light_sec) ?? 0}m</span>
                  <span>Moderate {secToMin(hrZones.moderate_sec) ?? 0}m</span>
                  <span>Vigorous {secToMin(hrZones.vigorous_sec) ?? 0}m</span>
                  <span>Peak {secToMin(hrZones.peak_sec) ?? 0}m</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {hasGoogleHealthWindow && (
          <Card>
            <CardHeader>
              <CardTitle>Heart rate during this session</CardTitle>
            </CardHeader>
            <CardContent>
              <HeartRateChart startTime={session.start_time} endTime={session.end_time!} />
            </CardContent>
          </Card>
        )}

        {exerciseGroups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Exercises</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {exerciseGroups.map((group) => (
                <div key={group.exerciseName}>
                  <p className="mb-1 font-medium">{group.exerciseName}</p>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {group.sets.map((s, i) => (
                      <span key={i} className="rounded-md border px-2 py-1">
                        {s.reps ?? "-"} reps{s.weight_kg ? ` @ ${s.weight_kg}kg` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {(match || practice) && (
          <Card>
            <CardHeader>
              <CardTitle>{match ? "Match detail" : "Practice detail"}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {match && (
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Opponent</dt>
                    <dd className="font-medium">{match.opponent ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Goals</dt>
                    <dd className="font-medium">{match.goals}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Assists</dt>
                    <dd className="font-medium">{match.assists}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Steals</dt>
                    <dd className="font-medium">{match.steals}</dd>
                  </div>
                </dl>
              )}
              {practice && (
                <dl className="grid grid-cols-2 gap-2">
                  <div>
                    <dt className="text-muted-foreground">Focus</dt>
                    <dd className="font-medium">{practice.practice_focus ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Complexity</dt>
                    <dd className="font-medium">{practice.tactical_complexity ?? "-"}</dd>
                  </div>
                </dl>
              )}
              {handball?.comments && <p className="mt-2 text-muted-foreground">{handball.comments}</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
