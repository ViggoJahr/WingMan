import { PageShell } from "@/components/PageShell"

/**
 * Served for every route in the group, so it stays shape-agnostic: a heading
 * and two blocks. It used to be a six-tile dashboard grid, which meant /plan
 * and /settings flashed a layout they never render and then reflowed.
 */
export default function Loading() {
  return (
    <PageShell className="gap-4" aria-busy>
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-muted/60" />
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
      <span className="sr-only">Loading</span>
    </PageShell>
  )
}
