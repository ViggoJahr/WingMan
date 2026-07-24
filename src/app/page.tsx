import Link from "next/link"
import { Nav } from "@/components/nav"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"

const SESSION_TYPE_LABEL: Record<string, string> = {
  strength_power: "Strength",
  cardio: "Cardio",
  mobility_rehab: "Mobility/Rehab",
  active_rest: "Active rest",
  handball: "Handball",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
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

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, type, start_time, rpe, location, external_source")
    .order("start_time", { ascending: false })
    .limit(20)

  const { data: readinessEntries } = await supabase
    .from("readiness")
    .select("id, date, total_score")
    .order("date", { ascending: false })
    .limit(7)

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

        <div className="flex flex-wrap gap-2">
          <Link href="/log/practice" className={cn(buttonVariants({ size: "sm" }))}>
            + Practice
          </Link>
          <Link href="/log/match" className={cn(buttonVariants({ size: "sm" }))}>
            + Match
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
            <CardTitle>Recent readiness</CardTitle>
          </CardHeader>
          <CardContent>
            {readinessEntries && readinessEntries.length > 0 ? (
              <ul className="flex flex-col gap-1 text-sm">
                {readinessEntries.map((r) => (
                  <li key={r.id} className="flex justify-between">
                    <span>{r.date}</span>
                    <span className="font-medium">{r.total_score}/100</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions && sessions.length > 0 ? (
              <ul className="flex flex-col divide-y">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {SESSION_TYPE_LABEL[s.type] ?? s.type}
                        {s.external_source && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            via {s.external_source}
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground">{formatDate(s.start_time)}</p>
                    </div>
                    <div className="text-right text-muted-foreground">
                      {s.location && <p>{s.location}</p>}
                      {s.rpe != null && <p>RPE {s.rpe}</p>}
                    </div>
                  </li>
                ))}
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
