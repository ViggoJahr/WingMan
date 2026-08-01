import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PageShell } from "@/components/PageShell"
import { createClient } from "@/lib/supabase/server"
import { sourceLabel } from "@/lib/labels"
import { triggerSync } from "./actions"

// Run outcomes are status, not series - chart colours were standing in for
// --status-* here, which meant a rebrand of the chart ramp would silently
// change what "this sync succeeded" looks like.
const STATUS_STYLE: Record<string, string> = {
  success: "text-status-good",
  partial: "text-status-warning",
  error: "text-status-critical",
  running: "text-muted-foreground",
}

export default async function SyncPage({
  searchParams,
}: {
  searchParams: Promise<{ synced?: string }>
}) {
  const { synced } = await searchParams
  const supabase = await createClient()

  const { data: runs } = await supabase
    .from("sync_runs")
    .select("id, status, items_synced, error_message, started_at, finished_at, integration_accounts(source)")
    .order("started_at", { ascending: false })
    .limit(30)

  return (
    <PageShell>
      <PageHeader
        title="Sync history"
        description="Runs every day automatically; trigger one now if you don't want to wait."
        actions={
          <form action={triggerSync}>
            <Button type="submit" size="sm">
              Sync now
            </Button>
          </form>
        }
      />

      {synced && (
        <p className="rounded-md bg-secondary p-2 text-sm text-secondary-foreground">
          Sync triggered.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runs && runs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-4">Source</th>
                    <th className="py-1 pr-4">Status</th>
                    <th className="py-1 pr-4">Items</th>
                    <th className="py-1 pr-4">Started</th>
                    <th className="py-1">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {runs.map((run) => {
                    const source = (run.integration_accounts as unknown as { source: string } | null)
                      ?.source
                    return (
                      <tr key={run.id}>
                        <td className="py-1 pr-4">{source ? sourceLabel(source) : "-"}</td>
                        <td className={`py-1 pr-4 font-medium ${STATUS_STYLE[run.status] ?? ""}`}>
                          {run.status}
                        </td>
                        <td className="py-1 pr-4">{run.items_synced ?? 0}</td>
                        <td className="py-1 pr-4 text-muted-foreground">
                          {new Date(run.started_at).toLocaleString()}
                        </td>
                        <td className="py-1 max-w-xs truncate text-muted-foreground" title={run.error_message ?? ""}>
                          {run.error_message ?? ""}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No syncs have run yet.</p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
