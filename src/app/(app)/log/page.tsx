import Link from "next/link"
import { Dumbbell, Gauge, HeartCrack, Target, Users } from "lucide-react"
import { PageHeader, PageShell } from "@/components/PageShell"

const LOG_TYPES = [
  {
    href: "/log/practice",
    icon: Users,
    title: "Practice",
    description: "Team practice - focus, complexity, notes",
  },
  {
    href: "/log/match",
    icon: Target,
    title: "Match",
    description: "Full box score and opponent detail",
  },
  {
    href: "/log/workout",
    icon: Dumbbell,
    title: "Workout",
    description: "Gym or cardio session not covered by sync",
  },
  {
    href: "/log/readiness",
    icon: Gauge,
    title: "Readiness check-in",
    description: "Daily wellness questionnaire",
  },
  {
    href: "/log/injury",
    icon: HeartCrack,
    title: "Injury",
    description: "What, when, and how much it stopped you",
  },
]

export default function LogHubPage() {
  return (
    <PageShell className="gap-4">
      <PageHeader title="Log" description="What would you like to log?" />

      {/* Single column on a phone: these are the primary actions of the app and
          a two-up grid at 360px left every description clipped to one line. */}
      <div className="grid gap-2.5 xs:grid-cols-2">
        {LOG_TYPES.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-accent"
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-brand"
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-heading font-medium">{item.title}</span>
                <span className="text-sm text-muted-foreground">{item.description}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </PageShell>
  )
}
