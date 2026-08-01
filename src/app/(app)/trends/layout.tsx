import { PageHeader, PageShell } from "@/components/PageShell"
import { TrendsTabs } from "./TrendsTabs"

/**
 * Three views of the same 90-day window, so they share a shell and a tab bar
 * rather than being three unrelated destinations.
 *
 * They are still separate routes, not client-side tab state: each one is a
 * server component doing its own query, the sidebar can deep-link to any of
 * them, and the browser's back button behaves. The tabs are links.
 */
export default function TrendsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell>
      <PageHeader
        title="Trends"
        description="Load, readiness and body metrics over the last 90 days."
      />
      <TrendsTabs />
      {children}
    </PageShell>
  )
}
