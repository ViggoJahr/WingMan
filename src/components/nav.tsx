import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GROUP_ORDER, GROUP_LABEL, routesInGroup } from "@/lib/routes"
import { signOut } from "@/app/login/actions"

/**
 * Desktop navigation. Reads @/lib/routes so it cannot drift from the mobile bar
 * or /more - which is the point of this file; the presentation here is interim.
 *
 * The manifest's grouping controls order and inserts a hairline between groups,
 * but the group *names* are not rendered. On a horizontal bar four uppercase
 * labels cost three rows and read as clutter; the names earn their space in a
 * vertical rail, where the sidebar will use them.
 */
export function Nav() {
  return (
    <nav className="hidden flex-wrap items-center justify-between gap-x-8 gap-y-2 border-b p-4 sm:flex">
      <div className="flex flex-wrap items-center gap-y-2 text-sm">
        {GROUP_ORDER.map((group, index) => (
          <div key={group} className="flex flex-wrap items-center">
            {index > 0 && <span aria-hidden className="mx-3 h-4 w-px bg-border" />}
            {routesInGroup(group).map((route) => (
              <Link
                key={route.href}
                href={route.href}
                title={GROUP_LABEL[group]}
                className="rounded-md px-2 py-1 transition-colors hover:text-brand"
              >
                {route.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <form action={signOut}>
        <Button variant="outline" size="sm" type="submit">
          Sign out
        </Button>
      </form>
    </nav>
  )
}
