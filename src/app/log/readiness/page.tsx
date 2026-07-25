import { Nav } from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { ReadinessForm } from "./ReadinessForm"

function todayLocalDate() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default async function LogReadinessPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = todayLocalDate()
  let previousScore: number | null = null
  if (user) {
    const { data: previous } = await supabase
      .from("readiness")
      .select("total_score")
      .eq("user_id", user.id)
      .lt("date", today)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle()
    previousScore = previous?.total_score ?? null
  }

  return (
    <div className="flex flex-col">
      <Nav />
      <div className="flex justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Daily readiness check-in</CardTitle>
          </CardHeader>
          <CardContent>
            <ReadinessForm date={today} previousScore={previousScore} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
