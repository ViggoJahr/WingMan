import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination, pageParam, paginationRange, splitPage } from "@/components/Pagination"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

const RESOURCE_TYPES = [
  "workout_plan",
  "workout_assignment",
  "workout_exercise",
  "daily_team_session",
  "daily_session_workout",
] as const

const RESOURCE_LABEL: Record<string, string> = {
  workout_plan: "Workout plan",
  workout_assignment: "Assignment",
  workout_exercise: "Exercise",
  daily_team_session: "Team session",
  daily_session_workout: "Session workout",
}

const PAGE_SIZE = 30

type Payload = Record<string, unknown>

function renderSummary(resourceType: string, payload: Payload): { title: string; detail: string } {
  switch (resourceType) {
    case "workout_plan":
      return {
        title: String(payload.name ?? "Untitled plan"),
        detail: [payload.workout_type, payload.intensity_level].filter(Boolean).join(" - "),
      }
    case "workout_assignment":
      return {
        title: `Assignment (${payload.status ?? "unknown"})`,
        detail: [payload.start_date, payload.end_date].filter(Boolean).join(" -> "),
      }
    case "workout_exercise":
      return {
        title: String(payload.exercise_name ?? "Exercise"),
        detail: [payload.sets && `${payload.sets} sets`, payload.reps && `${payload.reps} reps`]
          .filter(Boolean)
          .join(" x "),
      }
    case "daily_team_session":
      return {
        title: `Team session - ${payload.training_type ?? ""}`,
        detail: [payload.strength_phase, payload.endurance_phase].filter(Boolean).join(" / "),
      }
    case "daily_session_workout":
      return {
        title: `Session workout - ${payload.workout_type ?? ""}`,
        detail: "",
      }
    default: {
      const entries = Object.entries(payload)
        .filter(([, v]) => typeof v !== "object" || v === null)
        .slice(0, 5)
      return {
        title: RESOURCE_LABEL[resourceType] ?? resourceType,
        detail: entries.map(([k, v]) => `${k}: ${v}`).join(", "),
      }
    }
  }
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>
}) {
  const { type, page: rawPage } = await searchParams
  const supabase = await createClient()
  const page = pageParam(rawPage)

  let query = supabase
    .from("external_plan_items")
    .select("id, resource_type, payload, synced_at")
    .order("synced_at", { ascending: false })
    .range(...paginationRange(page, PAGE_SIZE))

  if (type) query = query.eq("resource_type", type)

  const { data: rows } = await query
  const { items, hasNext } = splitPage(rows, PAGE_SIZE)
  const pageLink = (newPage: number) =>
    `/plan?${new URLSearchParams({
      ...(type ? { type } : {}),
      ...(newPage > 0 ? { page: String(newPage) } : {}),
    })}`

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Plan</h1>
          <p className="text-muted-foreground">
            TUGG&apos;s prescribed/planned workouts - reference only, not editable here.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/plan"
            className={cn("rounded-md border px-2 py-1", !type && "bg-accent font-medium")}
          >
            All
          </Link>
          {RESOURCE_TYPES.map((t) => (
            <Link
              key={t}
              href={`/plan?type=${t}`}
              className={cn("rounded-md border px-2 py-1", type === t && "bg-accent font-medium")}
            >
              {RESOURCE_LABEL[t]}
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length > 0 ? (
              <ul className="flex flex-col divide-y text-sm">
                {items.map((item) => {
                  const { title, detail } = renderSummary(item.resource_type, item.payload as Payload)
                  return (
                    <li key={item.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium">{title}</p>
                        {detail && <p className="text-muted-foreground">{detail}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {RESOURCE_LABEL[item.resource_type] ?? item.resource_type}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No planned items synced yet.</p>
            )}
          </CardContent>
        </Card>

        <Pagination page={page} hasNext={hasNext} hrefFor={pageLink} />
      </div>
  )
}
