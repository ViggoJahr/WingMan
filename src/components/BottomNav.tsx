"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { TAB_ROUTES, isActiveRoute } from "@/lib/routes"

/**
 * A floating pill rather than a bar welded to the bottom edge.
 *
 * This is the single most recognisable piece of the reference's chrome, and it
 * is not only decoration: content scrolls *under* a floating bar, so the page
 * reads as continuous instead of ending at a hard rule two-thirds of the way
 * down a tall phone. The backdrop blur is what keeps the labels legible while
 * that happens.
 *
 * The active tab gets a filled lozenge instead of just a colour change. At
 * thumb distance a tinted 20px glyph among four other 20px glyphs is genuinely
 * hard to pick out; a shape is not.
 */
export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-10 flex justify-center sm:hidden",
        // The safe-area inset is padding on the wrapper, not the pill, so the
        // pill floats a consistent distance above the home indicator rather
        // than growing taller on devices that have one.
        "px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      )}
    >
      <div className="flex w-full max-w-md items-center gap-1 rounded-full bg-card/85 p-1.5 shadow-lg ring-1 ring-foreground/10 backdrop-blur-md">
        {TAB_ROUTES.map((tab) => {
          const active = isActiveRoute(pathname, tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[11px] transition-colors",
                active
                  ? "bg-brand-muted font-medium text-brand"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-5" aria-hidden />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
