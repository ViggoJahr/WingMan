import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const LOG_TYPES = [
  { href: "/log/practice", title: "Practice", description: "Team practice - focus, complexity, notes" },
  { href: "/log/match", title: "Match", description: "Full box score and opponent detail" },
  { href: "/log/workout", title: "Workout", description: "Gym or cardio session not covered by sync" },
  { href: "/log/readiness", title: "Readiness check-in", description: "Daily wellness questionnaire" },
]

export default function LogHubPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Log</h1>
        <p className="text-muted-foreground">What would you like to log?</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {LOG_TYPES.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
