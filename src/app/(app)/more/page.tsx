import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/login/actions"

const GROUPS = [
  {
    label: "Trends",
    links: [
      { href: "/training-load", label: "Training load" },
      { href: "/readiness", label: "Readiness" },
      { href: "/handball", label: "Handball" },
      { href: "/health", label: "Body & recovery" },
      { href: "/tests", label: "Tests" },
    ],
  },
  {
    label: "Reference",
    links: [{ href: "/plan", label: "Plan" }],
  },
  {
    label: "Account",
    links: [
      { href: "/sync", label: "Sync" },
      { href: "/settings", label: "Settings" },
    ],
  },
]

export default function MorePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">More</h1>
      {GROUPS.map((group) => (
        <Card key={group.label}>
          <CardHeader>
            <CardTitle className="text-base">{group.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="block py-2 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
      <form action={signOut}>
        <Button variant="outline" type="submit" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  )
}
