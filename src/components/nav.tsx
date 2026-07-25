import Link from "next/link"
import { Button } from "@/components/ui/button"
import { signOut } from "@/app/login/actions"

const links = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/log", label: "Log" },
  { href: "/training-load", label: "Training load" },
  { href: "/readiness", label: "Readiness" },
  { href: "/handball", label: "Handball" },
  { href: "/health", label: "Body & recovery" },
  { href: "/tests", label: "Tests" },
  { href: "/plan", label: "Plan" },
  { href: "/sync", label: "Sync" },
  { href: "/settings", label: "Settings" },
]

export function Nav() {
  return (
    <nav className="hidden flex-wrap items-center justify-between gap-2 border-b p-4 sm:flex">
      <div className="flex flex-wrap gap-4 text-sm">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:underline">
            {link.label}
          </Link>
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
