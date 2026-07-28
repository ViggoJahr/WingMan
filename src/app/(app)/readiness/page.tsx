import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { isoDaysAgo } from "@/lib/dates"
import { TrendChart } from "@/components/charts/TrendChart"

export default async function ReadinessTrendPage() {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from("readiness")
    .select("date, total_score")
    .gte("date", isoDaysAgo(90))
    .order("date", { ascending: true })

  const points = (entries ?? []).map((e) => ({ date: e.date, value: e.total_score ?? 0 }))
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
              {latest ? `Today: ${latest.value}/100` : "Readiness score"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {points.length > 0 ? (
              <TrendChart
                data={points}
                kind="line"
                color="chart-1"
                format={{ suffix: "/100" }}
                yDomain={[0, 100]}
                height={280}
              />
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
                      <span className="font-medium">{c.value}/100</span>
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
