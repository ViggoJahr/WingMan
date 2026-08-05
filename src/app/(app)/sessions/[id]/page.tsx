import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton"
import { RpeQuickSet } from "@/components/RpeQuickSet"
import { PageHeader, PageShell } from "@/components/PageShell"
import { StackedBar } from "@/components/charts/StackedBar"
import { CardSection, Stat, StatGrid } from "@/components/metrics/StatGrid"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { formatDateTime } from "@/lib/dates"
import { sessionTypeLabel, sourceLabel } from "@/lib/labels"
import {
  POSITION_LABELS,
  loadBandLabel,
  throwBandLabel,
  type HandballPosition,
} from "@/lib/handball/vocab"
import { HeartRateChart } from "./HeartRateChart"
import { deleteSession } from "./actions"

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

/**
 * Ordered light-to-peak, and coloured as one ramp for the same reason the sleep
 * stages are: these are degrees of one thing, not four separate categories.
 */
const HR_ZONES = [
  { key: "light_sec", label: "Light", fill: "color-mix(in oklab, var(--brand-accent) 30%, transparent)" },
  { key: "moderate_sec", label: "Moderate", fill: "color-mix(in oklab, var(--brand-accent) 55%, transparent)" },
  { key: "vigorous_sec", label: "Vigorous", fill: "color-mix(in oklab, var(--brand-accent) 80%, transparent)" },
  { key: "peak_sec", label: "Peak", fill: "var(--status-warning)" },
] as const

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, type, start_time, end_time, rpe, manual_rpe, location, surface, calories_kcal, active_duration_seconds, active_zone_minutes, hr_zones, external_source, merged_into"
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
  let eventCount = 0
  if (handball) {
    // Counters come from the derived view, not the stale columns on `matches`.
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from("match_box_score").select("*").eq("session_id", id).maybeSingle(),
      supabase.from("team_practices").select("*").eq("session_id", id).maybeSingle(),
    ])
    match = m
    practice = p
    eventCount = m?.event_count ?? 0
  }

  const duration = formatDuration(session.start_time, session.end_time)
  const hrZones = session.hr_zones as
    | { light_sec: number | null; moderate_sec: number | null; vigorous_sec: number | null; peak_sec: number | null }
    | null

  return (
    <PageShell>
      <PageHeader
        title={
          sessionTypeLabel(session.type) +
          (cardio?.focus || strength?.focus ? ` - ${cardio?.focus ?? strength?.focus}` : "")
        }
        description={
          <>
            {formatDateTime(session.start_time)}
            {sourcesInvolved.length > 0 && (
              <span className="block text-xs">
                Data from {sourcesInvolved.map(sourceLabel).join(" + ")}
              </span>
            )}
          </>
        }
        actions={
          session.external_source === null ? (
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/sessions/${id}/edit`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                Edit
              </Link>
              <ConfirmDeleteButton
                action={deleteSession.bind(null, id)}
                confirmText="Delete this session? This cannot be undone."
              />
            </div>
          ) : (
            <p className="shrink-0 text-xs text-muted-foreground">
              Synced from {sourceLabel(session.external_source)} - edit disabled
            </p>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <StatGrid>
            <Stat label="Duration" value={duration} />
            <Stat
              label="RPE"
              value={session.manual_rpe ?? session.rpe}
              hint={
                session.manual_rpe != null &&
                session.rpe != null &&
                session.manual_rpe !== session.rpe
                  ? `yours; source said ${session.rpe}`
                  : undefined
              }
            />
            <Stat
              label="Calories"
              value={session.calories_kcal != null ? `${session.calories_kcal} kcal` : null}
            />
            <Stat
              label="Active time"
              value={
                session.active_duration_seconds != null
                  ? `${secToMin(session.active_duration_seconds)}m`
                  : null
              }
            />
            <Stat label="Active zone min" value={session.active_zone_minutes} />
            <Stat label="Avg HR" value={cardio?.avg_hr != null ? `${cardio.avg_hr} bpm` : null} />
            <Stat
              label="Distance"
              value={cardio?.distance_m != null ? `${(cardio.distance_m / 1000).toFixed(2)} km` : null}
            />
            <Stat label="Location" value={session.location} />
          </StatGrid>

          <CardSection title="Your RPE" className="mt-4">
            <RpeQuickSet
              sessionId={session.id}
              currentRpe={session.manual_rpe}
              syncedRpe={session.rpe}
            />
          </CardSection>

          {hrZones && (
            <CardSection title="Heart-rate zones" className="mt-4">
              {/* Already stored on every synced session; it was four lines of
                  plain text. Zones are ordered by intensity, not categorical,
                  so one ramp carries the meaning better than four hues. */}
              <StackedBar
                segments={HR_ZONES.map((zone) => ({
                  key: zone.key,
                  label: zone.label,
                  value: secToMin(hrZones[zone.key]) ?? 0,
                  fill: zone.fill,
                }))}
                formatValue={(minutes) => `${minutes}m`}
                emptyMessage="No zone time recorded for this session."
              />
            </CardSection>
          )}
        </CardContent>
      </Card>

      {hasGoogleHealthWindow && (
        <Card>
          <CardHeader>
            <CardTitle>Heart rate during this session</CardTitle>
          </CardHeader>
          <CardContent>
            <HeartRateChart
              sessionId={id}
              startTime={session.start_time}
              endTime={session.end_time!}
            />
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
                <p className="mb-1.5 font-medium">{group.exerciseName}</p>
                <div className="flex flex-wrap gap-1.5 text-sm">
                  {group.sets.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-surface-sunken px-2.5 py-1 text-muted-foreground tabular-nums"
                    >
                      {s.reps ?? "-"} reps{s.weight_kg ? ` @ ${s.weight_kg}kg` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* A session the sync detected as handball but knows nothing about. It has
          neither a match nor a practice row, so this cannot live inside the
          detail card below - that card only renders once one of them exists,
          which is exactly what this offers to create.

          Describing it here is what stops a duplicate being logged by hand, and
          sessionMerge cannot clean that up: it only merges across differing
          external sources, and a hand-logged session has none. */}
      {handball?.subtype === "individual" && (
        <Card>
          <CardHeader>
            <CardTitle>Detected handball session</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="text-muted-foreground">
              Your watch recorded this but not what it was. Add the detail here rather than logging
              it again - the timing stays as measured.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/sessions/${id}/attach?as=practice`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                It was a practice
              </Link>
              <Link
                href={`/sessions/${id}/attach?as=match`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                It was a match
              </Link>
            </div>
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
              <>
                <StatGrid className="sm:grid-cols-4">
                  <Stat label="Opponent" value={match.opponent ?? "-"} />
                  <Stat
                    label="Score"
                    value={
                      match.final_score_us != null && match.final_score_them != null
                        ? `${match.final_score_us}-${match.final_score_them}`
                        : null
                    }
                  />
                  <Stat label="Goals" value={match.goals} />
                  <Stat label="Assists" value={match.assists} />
                  <Stat label="9m" value={match.nine_m_shots} />
                  <Stat label="Breakthroughs" value={match.breakthroughs} />
                  <Stat label="Steals" value={match.steals} />
                  <Stat label="Tech faults" value={match.technical_faults} />
                </StatGrid>
                <Link
                  href={`/sessions/${id}/review`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
                >
                  {eventCount > 0 ? `Review video - ${eventCount} events` : "Tag events from video"}
                </Link>
              </>
            )}
            {practice && (
              <StatGrid className="sm:grid-cols-2">
                <Stat label="Focus" value={practice.practice_focus ?? "-"} />
                <Stat label="Complexity" value={practice.tactical_complexity ?? "-"} />
              </StatGrid>
            )}

            {/* Tissue-specific dose lives on handball_sessions, so it shows for
                matches and practices alike. Hidden entirely when nothing was
                logged, which is every session predating the band fields. */}
            {handball &&
              (handball.position != null ||
                handball.throws_count != null ||
                handball.jump_load != null ||
                handball.contact_load != null ||
                handball.perceived_performance != null) && (
                <CardSection title="Tissue load" className="mt-4">
                  <StatGrid className="sm:grid-cols-5">
                    <Stat
                      label="Position"
                      value={
                        handball.position
                          ? (POSITION_LABELS[handball.position as HandballPosition] ??
                            handball.position)
                          : "-"
                      }
                    />
                    <Stat label="Throws" value={throwBandLabel(handball.throws_count) ?? "-"} />
                    <Stat label="Jumping" value={loadBandLabel(handball.jump_load) ?? "-"} />
                    <Stat label="Contact" value={loadBandLabel(handball.contact_load) ?? "-"} />
                    <Stat
                      label="How it went"
                      value={
                        handball.perceived_performance != null
                          ? `${handball.perceived_performance}/10`
                          : "-"
                      }
                    />
                  </StatGrid>
                </CardSection>
              )}

            {handball?.comments && <p className="mt-3 text-muted-foreground">{handball.comments}</p>}
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}
