import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader, PageShell } from "@/components/PageShell"
import { ThemeToggle } from "@/components/ThemeToggle"
import { GROUP_LABEL, OVERFLOW_GROUPS, routesInGroup } from "@/lib/routes"
import { signOut } from "@/app/login/actions"

/**
 * Everything the four-tab bar cannot hold, grouped. Phone only.
 *
 * The group names are headings on the page rather than card titles, matching
 * the rest of the app after the rebuild - a card around the word "Trends" made
 * the label look like content.
 */
export default function MorePage() {
  return (
    <PageShell width="narrow" className="gap-5">
      <PageHeader title="More" />

      {OVERFLOW_GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {GROUP_LABEL[group]}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {routesInGroup(group).map((route) => {
              const Icon = route.icon
              return (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className="group/row flex items-center gap-3 rounded-xl bg-card p-3.5 text-sm ring-1 ring-foreground/10 transition-colors hover:bg-accent"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand"
                      aria-hidden
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="font-medium">{route.label}</span>
                    <ChevronRight
                      className="ml-auto size-4 text-muted-foreground transition-transform group-hover/row:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Appearance
        </h2>
        <div className="rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
          <ThemeToggle />
        </div>
      </section>

      <form action={signOut}>
        <Button variant="outline" type="submit" className="w-full">
          Sign out
        </Button>
      </form>
    </PageShell>
  )
}
