import Link from "next/link"
import { CircleAlert } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PageShell } from "@/components/PageShell"
import { DataTable, type DataColumn } from "@/components/DataTable"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { sourceLabel } from "@/lib/labels"
import { isReauthRequired, reauthHint } from "@/lib/integrations/authErrors"
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

  // NonNullable because the query result is `Row[] | null`, and indexing a
  // nullable array type is not a thing TypeScript will do.
  const rowSource = (run: NonNullable<typeof runs>[number]) =>
    (run.integration_accounts as unknown as { source: string } | null)?.source

  /**
   * The most recent run per source, and only that one.
   *
   * A dead credential produces an identical red row every night, so the table
   * alone reads as "lots of errors" rather than "two connections need you" -
   * eight rows across four days said the same two things. Judging only the
   * latest run per source also means a reconnect clears the banner on the next
   * sync without the history having to be tidied up.
   */
  const needsReauth: { source: string; message: string }[] = []
  const seen = new Set<string>()
  for (const run of runs ?? []) {
    const source = rowSource(run)
    if (!source || seen.has(source)) continue
    seen.add(source)
    if (run.status === "error" && isReauthRequired(run.error_message)) {
      needsReauth.push({ source, message: reauthHint(source) })
    }
  }

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

      {needsReauth.map(({ source, message }) => (
        <div
          key={source}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-status-critical-soft p-4 text-sm ring-1 ring-status-critical/30"
        >
          <span className="flex items-center gap-1.5 font-medium text-status-critical">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {sourceLabel(source)} needs reconnecting
          </span>
          <span className="min-w-0 flex-1 text-muted-foreground">{message}</span>
          <Link
            href="/settings"
            className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
          >
            Reconnect
          </Link>
        </div>
      ))}

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
