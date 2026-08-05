"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { TIME_RANGES, parseRange } from "@/lib/timeRange"
import { SEGMENTED_GROUP, segmentedItem } from "./segmented"

/**
 * 30D / 3M / 6M / 1Y, as links rather than client state.
 *
 * Same reasoning as TrendsTabs: the window changes what the *server* queries,
 * so making it a `useState` would mean either shipping a year of data to the
 * client and slicing it there, or a fetch-on-click that the page's own server
 * query already does better. As search-param links, the back button works and a
 * window is shareable.
 *
 * Existing params are preserved, because more than one of these can end up on a
 * page alongside a date filter or a session-type filter.
 */
export function RangePills({ className }: { className?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = parseRange(searchParams.get("range"))

  const hrefFor = (key: string) => {
    const next = new URLSearchParams(searchParams)
    next.set("range", key)
    return `${pathname}?${next}`
  }

  return (
    <nav aria-label="Time range" className={cn(SEGMENTED_GROUP, className)}>
      {TIME_RANGES.map((range) => {
        const active = range.key === current
        return (
          <Link
            key={range.key}
            href={hrefFor(range.key)}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={segmentedItem(active)}
          >
            {range.label}
          </Link>
        )
      })}
    </nav>
  )
}
