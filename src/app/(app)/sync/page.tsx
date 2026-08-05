import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PageShell } from "@/components/PageShell"
import { DataTable, type DataColumn } from "@/components/DataTable"
import { createClient } from "@/lib/supabase/server"
import { sourceLabel } from "@/lib/labels"
import { triggerSync } from "./actions"

const RUN_COLUMNS: readonly DataColumn[] = [
  { key: "source", header: "Source" },
  {
    key: "status",
    header: "Status",
    // Run outcomes are status, not series - these used to be *chart* colours,
    // so a rebrand of the ramp would have silently changed what "succeeded"
    // looks like.
    tones: {
      success: "good",
      partial: "warning",
      error: "critical",
      running: "muted",
    },
  },
  { key: "items_synced", header: "Items", align: "right" },
  { key: "started_at", header: "Started" },
  { key: "error_message", header: "Note", truncate: true, emptyText: "" },
]

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
        <p className="rounded-xl bg-status-good-soft p-3 text-sm text-status-good">
          Sync triggered.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            exportName="sync-runs"
            initialSort="started_at"
            emptyMessage="No syncs have run yet."
            caption="Recent integration sync runs"
            columns={RUN_COLUMNS}
            rows={(runs ?? []).map((run) => {
              const source = (run.integration_accounts as unknown as { source: string } | null)
                ?.source
              return {
                id: run.id,
                source: source ? sourceLabel(source) : "-",
                status: run.status,
                items_synced: run.items_synced ?? 0,
                started_at: new Date(run.started_at).toLocaleString(),
                error_message: run.error_message ?? "",
              }
            })}
          />
        </CardContent>
      </Card>
    </PageShell>
  )
}
