"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  matchEventSchema,
  matchVideoSchema,
  type MatchEventInput,
  type MatchVideoInput,
} from "@/lib/validation/schemas"

// These are not useActionState form actions - the review UI is heavily
// client-side and calls them with typed arguments from useTransition, the same
// shape as setManualRpe in ../actions.ts. They throw on failure rather than
// returning ActionState, and the caller marks the affected rows as unsaved.

async function client() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return supabase
}

/**
 * Upsert on a client-minted uuid. Retrying after a dropped connection is then a
 * no-op instead of a duplicate goal, which is what lets the queue retry blindly.
 *
 * Takes an array even for a single event: the client coalesces whatever piled up
 * while a request was in flight, so a burst of taps becomes one round trip.
 */
export async function saveMatchEvents(
  sessionId: string,
  events: MatchEventInput[]
): Promise<void> {
  if (events.length === 0) return
  const supabase = await client()

  const rows = events.map((event) => {
    const parsed = matchEventSchema.parse(event)
    // RLS already scopes writes to the caller, but a payload naming a different
    // match would otherwise scatter events across sessions.
    if (parsed.session_id !== sessionId) {
      throw new Error("Event session_id does not match the match being tagged.")
    }
    return { ...parsed, session_id: sessionId }
  })

  const { error } = await supabase.from("match_events").upsert(rows, { onConflict: "id" })
  if (error) throw new Error(error.message)

  // Deliberately no revalidatePath: this runs on every tag, and refreshing the
  // server tree mid-tagging would fight the video player.
}

export async function deleteMatchEvent(sessionId: string, eventId: string): Promise<void> {
  const supabase = await client()

  const { error } = await supabase
    .from("match_events")
    .delete()
    .eq("id", eventId)
    .eq("session_id", sessionId)
  if (error) throw new Error(error.message)
}

/**
 * Binds a video to a match. One video per match in practice, so an existing row
 * is updated rather than accumulating rows; the handle_key is preserved so the
 * IndexedDB entry keeps resolving.
 */
export async function setMatchVideo(
  sessionId: string,
  input: MatchVideoInput
): Promise<{ id: string; handleKey: string }> {
  const supabase = await client()
  const parsed = matchVideoSchema.parse(input)

  const { data: existing } = await supabase
    .from("match_videos")
    .select("id, handle_key")
    .eq("session_id", sessionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from("match_videos")
      .update(parsed)
      .eq("id", existing.id)
    if (error) throw new Error(error.message)
    revalidatePath(`/sessions/${sessionId}/review`)
    return { id: existing.id, handleKey: existing.handle_key! }
  }

  const { data, error } = await supabase
    .from("match_videos")
    .insert({ ...parsed, session_id: sessionId })
    .select("id, handle_key")
    .single()
  if (error) throw new Error(error.message)

  revalidatePath(`/sessions/${sessionId}/review`)
  return { id: data.id, handleKey: data.handle_key! }
}

/**
 * Anchors a period's throw-off to a video position. Stored as a jsonb map rather
 * than two columns because halftime length varies and extra time adds periods.
 */
export async function setPeriodOffset(
  sessionId: string,
  videoId: string,
  period: number,
  videoSeconds: number
): Promise<void> {
  if (!Number.isFinite(videoSeconds) || videoSeconds < 0) {
    throw new Error("Period offset must be a position within the video.")
  }
  const supabase = await client()

  const { data: video, error: fetchErr } = await supabase
    .from("match_videos")
    .select("period_offsets")
    .eq("id", videoId)
    .eq("session_id", sessionId)
    .single()
  if (fetchErr) throw new Error(fetchErr.message)

  const offsets = {
    ...((video.period_offsets as Record<string, number>) ?? {}),
    [String(period)]: Math.round(videoSeconds * 1000) / 1000,
  }

  const { error } = await supabase
    .from("match_videos")
    .update({ period_offsets: offsets })
    .eq("id", videoId)
  if (error) throw new Error(error.message)
}

/** Explicit end of a tagging session - the one place the server tree refreshes. */
export async function finishTagging(sessionId: string): Promise<void> {
  await client()
  revalidatePath("/")
  revalidatePath("/handball")
  revalidatePath(`/sessions/${sessionId}`)
  redirect(`/sessions/${sessionId}`)
}
