import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { PracticeForm } from "./PracticeForm"

/**
 * Position almost never changes between sessions, so pre-selecting the last one
 * turns a required tap into a confirmation. Looks back over the recent handball
 * sessions rather than just the latest, since synced sessions carry no position.
 */
async function lastPosition(): Promise<string | null> {
  const supabase = await createClient()

  // RLS scopes both queries to the caller's own sessions.
  const { data: recent } = await supabase
    .from("sessions")
    .select("id")
    .eq("type", "handball")
    .order("start_time", { ascending: false })
    .limit(20)

  const ids = (recent ?? []).map((row) => row.id)
  if (ids.length === 0) return null

  const { data: handball } = await supabase
    .from("handball_sessions")
    .select("session_id, position")
    .in("session_id", ids)
    .not("position", "is", null)

  if (!handball || handball.length === 0) return null

  // `ids` is already newest-first; take the first that has a position.
  const byId = new Map(handball.map((row) => [row.session_id, row.position]))
  for (const id of ids) {
    const position = byId.get(id)
    if (position) return position
  }
  return null
}

export default async function LogPracticePage() {
  const position = await lastPosition()

  return (
    <div className="flex justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Log practice</CardTitle>
        </CardHeader>
        <CardContent>
          <PracticeForm mode="create" defaultPosition={position} />
        </CardContent>
      </Card>
    </div>
  )
}
