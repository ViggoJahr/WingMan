"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { TREND_TABS } from "@/lib/routes"

/**
 * Links, not tab state. Each tab is a real route with its own server-side
 * query, so this only needs to know which one is current.
 */
export function TrendsTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label="Trends" className="flex gap-1 border-b">
      {TREND_TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-brand font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
