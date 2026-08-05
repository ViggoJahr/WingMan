"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { TREND_TABS } from "@/lib/routes"
import { SEGMENTED_GROUP, segmentedItem } from "@/components/metrics/segmented"

/**
 * Links, not tab state. Each tab is a real route with its own server-side
 * query, so this only needs to know which one is current.
 *
 * Restyled from an underlined bar to a segmented control to match the range
 * pills beside it - two different tab idioms sitting on one line read as two
 * unrelated controls, and these are doing the same kind of job.
 *
 * The search string is carried across so the chosen range survives a tab
 * change; without it, moving from Load to Body silently reset the window to 30
 * days and looked like a data problem.
 */
export function TrendsTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  return (
    <nav aria-label="Trends" className={SEGMENTED_GROUP}>
      {TREND_TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={query ? `${tab.href}?${query}` : tab.href}
            aria-current={active ? "page" : undefined}
            className={segmentedItem(active)}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
