"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, ListFilter, Plus, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/history", label: "History", icon: ListFilter },
  { href: "/log", label: "Log", icon: Plus },
  { href: "/more", label: "More", icon: Menu },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background sm:hidden">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs",
              active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
