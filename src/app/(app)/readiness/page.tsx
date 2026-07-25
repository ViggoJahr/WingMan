import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { ReadinessChart } from "./chart"

export default async function ReadinessTrendPage() {
  const supabase = await createClient()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const { data: entries } = await supabase
    .from("readiness")
    .select("date, total_score")
    .gte("date", ninetyDaysAgo)
    .order("date", { ascending: true })

  const points = (entries ?? []).map((e) => ({ date: e.date, total_score: e.total_score ?? 0 }))
  const latest = points.at(-1)
  const recentCheckins = [...points].reverse().slice(0, 14)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Readiness trend</h1>
            <p className="text-muted-foreground">Last 90 days of daily check-ins.</p>
          </div>
          <Link href="/log/readiness" className={cn(buttonVariants({ size: "sm" }))}>
            + Check in
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>
              {latest ? `Today: ${latest.total_score}/100` : "Readiness score"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {points.length > 0 ? (
              <ReadinessChart data={points} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No readiness check-ins yet -{" "}
                <Link href="/log/readiness" className="underline">
                  log your first one
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>

        {recentCheckins.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y text-sm">
                {recentCheckins.map((c) => (
                  <li key={c.date} className="flex items-center justify-between py-2">
                    <span>{c.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{c.total_score}/100</span>
                      <Link href={`/log/readiness?date=${c.date}`} className="text-muted-foreground underline">
                        Edit
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
  )
}
