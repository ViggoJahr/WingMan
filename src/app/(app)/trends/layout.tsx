import { Suspense } from "react"
import { PageHeader, PageShell } from "@/components/PageShell"
import { RangePills } from "@/components/metrics/RangePills"
import { TrendsTabs } from "./TrendsTabs"

/**
 * Three views of one window, so they share a shell, a tab bar and a range.
 *
 * They are still separate routes, not client-side tab state: each one is a
 * server component doing its own query, the sidebar can deep-link to any of
 * them, and the browser's back button behaves. The tabs are links.
 *
 * The range pills live here rather than on each page so that switching tabs
 * keeps the window you chose - the search param survives the navigation, and
 * every page below reads the same one.
 */
export default function TrendsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell>
      <PageHeader title="Trends" description="Load, readiness and body metrics." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TrendsTabs />
        {/* useSearchParams needs a boundary; the fallback is the same size as
            the control so the header does not jump as it resolves. */}
        <Suspense fallback={<div className="h-9 w-52 rounded-full bg-surface-sunken" />}>
          <RangePills />
        </Suspense>
      </div>

      {children}
    </PageShell>
  )
}
