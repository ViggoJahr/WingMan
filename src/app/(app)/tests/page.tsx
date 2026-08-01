import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { TrendChart } from "@/components/charts/TrendChart"
import { PageHeader, PageShell } from "@/components/PageShell"

function formatTestType(testType: string) {
  return testType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export default async function TestsPage() {
  const supabase = await createClient()

  const [{ data: strengthRows }, { data: masRows }] = await Promise.all([
    supabase
      .from("strength_test_results")
      .select("test_type, weight, reps, estimated_1rm, test_date")
      .order("test_date", { ascending: true }),
    supabase.from("mas_tests").select("test_date, mas_mps").order("test_date", { ascending: true }),
  ])

  const byType = new Map<string, NonNullable<typeof strengthRows>>()
  for (const row of strengthRows ?? []) {
    if (!byType.has(row.test_type)) byType.set(row.test_type, [])
    byType.get(row.test_type)!.push(row)
  }

  const masPoints = (masRows ?? [])
    .filter((r) => r.mas_mps != null)
    .map((r) => ({ date: r.test_date, value: r.mas_mps! }))

  return (
    <PageShell>
      <PageHeader
        title="Tests"
        description="Strength and aerobic-speed test results, synced from TUGG."
      />

      {Array.from(byType.entries()).map(([testType, rows]) => {
        const hasOneRm = rows.some((r) => r.estimated_1rm != null)
        const points = hasOneRm
          ? rows.filter((r) => r.estimated_1rm != null).map((r) => ({ date: r.test_date, value: r.estimated_1rm! }))
          : rows.filter((r) => r.reps != null).map((r) => ({ date: r.test_date, value: r.reps! }))
        const latest = points.at(-1)?.value
        const unit = hasOneRm ? "kg est. 1RM" : "reps"

        return (
          <Card key={testType}>
            <CardHeader>
              <CardTitle>
                {formatTestType(testType)}
                {latest != null && `: ${latest} ${unit}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {points.length > 0 ? (
                <TrendChart
                  data={points}
                  kind="line"
                  color="chart-1"
                  format={{ suffix: ` ${unit}` }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No usable data points for this test.</p>
              )}
            </CardContent>
          </Card>
        )
      })}

      <Card>
        <CardHeader>
          <CardTitle>MAS (aerobic speed){masPoints.at(-1) && `: ${masPoints.at(-1)!.value.toFixed(2)} m/s`}</CardTitle>
        </CardHeader>
        <CardContent>
          {masPoints.length > 0 ? (
            <TrendChart data={masPoints} kind="line" color="chart-1" format={{ decimals: 2, suffix: " m/s" }} />
          ) : (
            <p className="text-sm text-muted-foreground">No MAS test data synced yet.</p>
          )}
        </CardContent>
      </Card>

      {byType.size === 0 && masPoints.length === 0 && (
        <p className="text-sm text-muted-foreground">No test results synced yet.</p>
      )}
    </PageShell>
  )
}
