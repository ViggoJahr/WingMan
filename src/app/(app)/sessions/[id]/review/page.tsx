import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MatchReview } from "./MatchReview"

export default async function ReviewMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: session } = await supabase
    .from("sessions")
    .select("id, type, start_time, merged_into")
    .eq("id", id)
    .maybeSingle()

  if (!session) notFound()
  if (session.merged_into) redirect(`/sessions/${session.merged_into}/review`)
  if (session.type !== "handball") notFound()

  const { data: handball } = await supabase
    .from("handball_sessions")
    .select("subtype")
    .eq("session_id", id)
    .maybeSingle()

  // Only matches get tagged. A practice has no clock and no opponent to review.
  if (handball?.subtype !== "match") notFound()

  const [{ data: match }, { data: video }, { data: events }] = await Promise.all([
    supabase.from("matches").select("opponent, is_home, play_time_min").eq("session_id", id).maybeSingle(),
    supabase.from("match_videos").select("*").eq("session_id", id).maybeSingle(),
    supabase
      .from("match_events")
      .select("*")
      .eq("session_id", id)
      .order("video_offset_seconds", { ascending: true, nullsFirst: false }),
  ])

  if (!match) notFound()

  // Plain data only across the server/client boundary - passing a function here
  // is what broke TrendChart (see docs/vision.md).
  return (
    <MatchReview
      sessionId={id}
      opponent={match.opponent}
      isHome={match.is_home}
      startTime={session.start_time}
      video={video ?? null}
      initialEvents={events ?? []}
    />
  )
}
