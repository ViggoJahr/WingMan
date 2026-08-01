import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader, PageShell } from "@/components/PageShell"
import { ThemeToggle } from "@/components/ThemeToggle"
import { GROUP_LABEL, OVERFLOW_GROUPS, routesInGroup } from "@/lib/routes"
import { signOut } from "@/app/login/actions"

/** Everything the four-tab bar cannot hold, grouped. Phone only. */
export default function MorePage() {
  return (
    <PageShell width="narrow" className="gap-4">
      <PageHeader title="More" />

      {OVERFLOW_GROUPS.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{GROUP_LABEL[group]}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y text-sm">
              {routesInGroup(group).map((route) => {
                const Icon = route.icon
                return (
                  <li key={route.href}>
                    <Link
                      href={route.href}
                      className="flex items-center gap-3 py-2.5 transition-colors hover:text-brand"
                    >
                      <Icon className="size-4 text-muted-foreground" aria-hidden />
                      {route.label}
                      <ChevronRight className="ml-auto size-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <form action={signOut}>
        <Button variant="outline" type="submit" className="w-full">
          Sign out
        </Button>
      </form>
    </PageShell>
  )
}
