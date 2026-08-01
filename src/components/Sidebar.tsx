"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useSyncExternalStore } from "react"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { GROUP_LABEL, GROUP_ORDER, isActiveRoute, routesInGroup } from "@/lib/routes"
import { signOut } from "@/app/login/actions"

const STORAGE_KEY = "sidebar-collapsed"

/**
 * The collapsed flag lives in localStorage, which is an external store - so it
 * is read through useSyncExternalStore rather than an effect that calls
 * setState. Same reasoning as ThemeToggle: reading it in a mount effect works
 * but triggers a cascading render, which react-hooks/set-state-in-effect
 * rejects. Local writes notify subscribers by hand, because the `storage` event
 * only fires in *other* tabs.
 */
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

function isCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    // Private mode. Expanded is the safe default.
    return false
  }
}

/** The server cannot know, and guessing "expanded" is the recoverable guess. */
function serverSnapshot(): boolean {
  return false
}

function persistCollapsed(next: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
  } catch {
    // Not worth failing a click over.
  }
  for (const listener of listeners) listener()
}

/**
 * Desktop navigation rail. Hidden below `sm`, where the tab bar takes over.
 *
 * Reads @/lib/routes like every other navigation surface, and unlike the
 * horizontal bar it replaced it renders the group *names*: eleven flat links
 * are a list you read rather than scan, and vertically the labels cost one line
 * each instead of pushing the whole bar onto a third row.
 */
export function Sidebar() {
  const pathname = usePathname()
  const collapsed = useSyncExternalStore(subscribe, isCollapsed, serverSnapshot)

  const toggle = useCallback(() => persistCollapsed(!isCollapsed()), [])

  return (
    <aside
      data-collapsed={collapsed}
      // Deliberately not animated. The width is only correct after hydration
      // reads localStorage, so a transition would play once on load for anyone
      // who left it collapsed - a snap costs nothing and avoids that entirely.
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 border-r bg-card/40 p-3 sm:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center gap-2 px-1 pb-3">
        {!collapsed && (
          <Link href="/" className="truncate font-heading font-semibold tracking-tight">
            Training Hub
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ml-auto rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {GROUP_ORDER.map((group) => (
          <div key={group} className="flex flex-col gap-0.5">
            {!collapsed && (
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
                {GROUP_LABEL[group]}
              </p>
            )}
            {routesInGroup(group).map((route) => {
              const active = isActiveRoute(pathname, route.href)
              const Icon = route.icon
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  title={collapsed ? route.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    collapsed && "justify-center",
                    active
                      ? "bg-brand-muted font-medium text-brand"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {!collapsed && <span className="truncate">{route.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <form action={signOut} className="pt-2">
        <button
          type="submit"
          title={collapsed ? "Sign out" : undefined}
          // text-left because a button centres its label by default, which put
          // "Sign out" out of line with every link above it.
          className={cn(
            "w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed && "px-0 text-center text-xs"
          )}
        >
          {collapsed ? "Out" : "Sign out"}
        </button>
      </form>
    </aside>
  )
}
