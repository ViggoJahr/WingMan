import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { triggerSync } from "./actions"

const SOURCE_LABEL: Record<string, string> = {
  tugg: "TUGG",
  google_health: "Google Health",
}

const STATUS_STYLE: Record<string, string> = {
  success: "text-[color:var(--chart-3)]",
  partial: "text-[color:var(--chart-4)]",
  error: "text-destructive",
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Sync history</h1>
            <p className="text-muted-foreground">
              Runs every day automatically; trigger one now if you don&apos;t want to wait.
            </p>
            {synced && (
              <p className="mt-2 rounded-md bg-secondary p-2 text-sm text-secondary-foreground">
                Sync triggered.
              </p>
            )}
          </div>
          <form action={triggerSync}>
            <Button type="submit" size="sm">
              Sync now
            </Button>
          </form>
        </div>

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
                          <td className="py-1 pr-4">{SOURCE_LABEL[source ?? ""] ?? source ?? "-"}</td>
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
      </div>
  )
}
