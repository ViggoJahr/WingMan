import { Nav } from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { ReadinessForm } from "./ReadinessForm"

function todayLocalDate() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default async function LogReadinessPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const date = dateParam ?? todayLocalDate()
  let previousScore: number | null = null
  let existingValues = null
  if (user) {
    const [{ data: previous }, { data: existing }] = await Promise.all([
      supabase
        .from("readiness")
        .select("total_score")
        .eq("user_id", user.id)
        .lt("date", date)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("readiness").select("*").eq("user_id", user.id).eq("date", date).maybeSingle(),
    ])
    previousScore = previous?.total_score ?? null
    existingValues = existing
  }

  return (
    <div className="flex flex-col">
      <Nav />
      <div className="flex justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{existingValues ? "Edit readiness check-in" : "Daily readiness check-in"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ReadinessForm date={date} previousScore={previousScore} existingValues={existingValues} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
