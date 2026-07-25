import Link from "next/link"
import { Nav } from "@/components/nav"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { computeSessionLoad } from "@/lib/services/trainingLoad"
import { READINESS_DIMENSIONS, WARNING_THRESHOLD, describeValue } from "@/lib/services/readinessDimensions"

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

function todayIso() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ logged?: string }>
}) {
  const { logged } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const today = todayIso()

  const [
    { data: sessions },
    { data: readinessEntries },
    { data: loadSessions },
    { data: dailyMetrics },
    { data: latestWeight },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "id, type, start_time, rpe, calories_kcal, external_source, cardio_sessions(focus, avg_hr), strength_sessions(focus)"
      )
      .is("merged_into", null)
      .order("start_time", { ascending: false })
      .limit(15),
    supabase
      .from("readiness")
      .select("id, date, total_score, current_injury, current_illness")
      .order("date", { ascending: false })
      .limit(7),
    supabase
      .from("sessions")
      .select("start_time, end_time, rpe")
      .is("merged_into", null)
      .gte("start_time", sevenDaysAgo),
    supabase.from("daily_metrics").select("steps").gte("date", sevenDaysAgo.slice(0, 10)),
    supabase
      .from("body_metrics")
      .select("weight_kg, date")
      .not("weight_kg", "is", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const todaysReadiness = (readinessEntries ?? []).find((r) => r.date === today)
  const latestReadiness = (readinessEntries ?? [])[0]
  const injuryDim = READINESS_DIMENSIONS.find((d) => d.field === "current_injury")!
  const illnessDim = READINESS_DIMENSIONS.find((d) => d.field === "current_illness")!
  const healthWarnings = latestReadiness
    ? [
        latestReadiness.current_injury != null && latestReadiness.current_injury >= WARNING_THRESHOLD
          ? { label: "Injury", description: describeValue(injuryDim, latestReadiness.current_injury) }
          : null,
        latestReadiness.current_illness != null && latestReadiness.current_illness >= WARNING_THRESHOLD
          ? { label: "Illness", description: describeValue(illnessDim, latestReadiness.current_illness) }
          : null,
      ].filter((w): w is { label: string; description: string } => w != null)
    : []
  const weeklyLoad = Math.round((loadSessions ?? []).reduce((sum, s) => sum + computeSessionLoad(s), 0))
  const stepsWithData = (dailyMetrics ?? []).filter((d) => d.steps != null)
  const avgSteps = stepsWithData.length
    ? Math.round(stepsWithData.reduce((sum, d) => sum + (d.steps ?? 0), 0) / stepsWithData.length)
    : null

  return (
    <div className="flex flex-col">
      <Nav />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Training Hub</h1>
          <p className="text-muted-foreground">Signed in as {user?.email}</p>
          {logged && (
            <p className="mt-2 rounded-md bg-secondary p-2 text-sm text-secondary-foreground">
              Saved your {logged} log.
            </p>
          )}
        </div>

        {healthWarnings.length > 0 && (
          <div className="rounded-md border border-[var(--status-critical)]/50 bg-[var(--status-critical)]/10 p-3 text-sm">
            <p className="font-medium text-[var(--status-critical)]">
              Consider adjusting training
              {latestReadiness.date !== today && ` (from ${latestReadiness.date})`}
            </p>
            <ul className="mt-1 list-disc pl-5 text-foreground">
              {healthWarnings.map((w) => (
                <li key={w.label}>
                  <span className="font-medium">{w.label}:</span> {w.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!todaysReadiness && (
          <Link
            href="/log/readiness"
            className="rounded-md border border-dashed p-4 text-sm hover:bg-accent"
          >
            <span className="font-medium">You haven&apos;t logged readiness today.</span>{" "}
            <span className="text-muted-foreground">Tap to check in.</span>
          </Link>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Readiness today</p>
            <p className="text-xl font-semibold">
              {todaysReadiness ? `${todaysReadiness.total_score}/100` : "-"}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Load (7d)</p>
            <p className="text-xl font-semibold">{weeklyLoad}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Avg steps (7d)</p>
            <p className="text-xl font-semibold">{avgSteps?.toLocaleString() ?? "-"}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Weight</p>
            <p className="text-xl font-semibold">
              {latestWeight?.weight_kg != null ? `${latestWeight.weight_kg} kg` : "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/log/practice" className={cn(buttonVariants({ size: "sm" }))}>
            + Practice
          </Link>
          <Link href="/log/match" className={cn(buttonVariants({ size: "sm" }))}>
            + Match
          </Link>
          <Link href="/log/workout" className={cn(buttonVariants({ size: "sm" }))}>
            + Workout
          </Link>
          <Link
            href="/log/readiness"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            + Readiness check-in
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent workouts</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions && sessions.length > 0 ? (
              <ul className="flex flex-col divide-y">
                {sessions.map((s) => {
                  const cardio = s.cardio_sessions as unknown as { focus: string | null; avg_hr: number | null } | null
                  const strength = s.strength_sessions as unknown as { focus: string | null } | null
                  const focus = cardio?.focus ?? strength?.focus
                  return (
                    <Link
                      key={s.id}
                      href={`/sessions/${s.id}`}
                      className="flex items-center justify-between py-2 text-sm hover:bg-accent"
                    >
                      <div>
                        <p className="font-medium">
                          {focus ?? SESSION_TYPE_LABEL[s.type] ?? s.type}
                          {s.external_source && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              via {SOURCE_LABEL[s.external_source] ?? s.external_source}
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground">{formatDateTime(s.start_time)}</p>
                      </div>
                      <div className="text-right text-muted-foreground">
                        {s.calories_kcal != null && <p>{s.calories_kcal} kcal</p>}
                        {s.rpe != null && <p>RPE {s.rpe}</p>}
                      </div>
                    </Link>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No sessions logged yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
