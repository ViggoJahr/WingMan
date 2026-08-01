"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { TAB_ROUTES, isActiveRoute } from "@/lib/routes"

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background pb-[env(safe-area-inset-bottom)] sm:hidden">
      {TAB_ROUTES.map((tab) => {
        const active = isActiveRoute(pathname, tab.href)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors",
              active ? "text-brand" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" aria-hidden />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
