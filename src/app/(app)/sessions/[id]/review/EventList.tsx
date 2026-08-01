"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import {
  EVENT_META,
  SCORING_EVENTS,
  SHOT_ORIGIN_LABELS,
  type MatchEventType,
  type ShotOrigin,
} from "@/lib/handball/events"
import { describeEventTime, type PeriodOffsets } from "@/lib/handball/videoClock"
import type { LocalEvent } from "./reviewTypes"

const TONE_TEXT: Record<string, string> = {
  good: "text-status-good",
  bad: "text-status-critical",
  neutral: "text-foreground",
}

const SYNC_HINT: Record<string, string> = {
  pending: "Saving...",
  failed: "Not saved",
  saved: "",
}

/**
 * The clip library. Clicking a row seeks the video to that moment - the whole
 * point of tagging against video rather than tallying counters.
 */
export function EventList({
  events,
  activeId,
  offsets,
  seekable,
  editingNote,
  onEditingNoteChange,
  onSeek,
  onDelete,
  onNote,
}: {
  events: LocalEvent[]
  activeId: string | null
  offsets: PeriodOffsets
  /** No video bound yet - rows still list, they just cannot jump anywhere. */
  seekable: boolean
  /** Controlled by the parent so the "n" shortcut can open the right row. */
  editingNote: string | null
  onEditingNoteChange: (id: string | null) => void
  onSeek: (event: LocalEvent) => void
  onDelete: (id: string) => void
  onNote: (id: string, note: string) => void
}) {
  const setEditingNote = onEditingNoteChange

  // Scoreboard as it stood at each clip, folded over the list rather than read
  // from the stored snapshot - `events` arrives in timeline order, and the
  // snapshot columns are context only now that deriveScore is authoritative.
  // Built up front rather than during the map: mutating a captured variable
  // inside the render callback is what react-hooks/immutability forbids, and it
  // has to sit above the empty-state return to keep the hook order stable.
  const scoreAt = useMemo(() => {
    const byId = new Map<string, string>()
    let us = 0
    let them = 0
    for (const event of events) {
      if (event.event_type === "goal" || event.event_type === "team_goal") us += 1
      else if (event.event_type === "opponent_goal") them += 1
      if (SCORING_EVENTS.has(event.event_type)) byId.set(event.id, `${us}-${them}`)
    }
    return byId
  }, [events])

  if (events.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No events yet. Play the video and tag as you watch - or press a shortcut key.
      </p>
    )
  }

  return (
    <ol className="flex flex-col gap-1">
      {events.map((event) => {
        const meta = EVENT_META[event.event_type as MatchEventType]
        const isActive = event.id === activeId
        const canSeek = seekable && event.video_offset_seconds != null

        const scoreLine = scoreAt.get(event.id)

        return (
          <li
            key={event.id}
            className={cn(
              "flex flex-col gap-1 rounded-md border px-3 py-2 text-sm",
              isActive && "border-primary/60 bg-accent/40",
              event.sync === "failed" && "border-status-critical/50"
            )}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canSeek}
                onClick={() => onSeek(event)}
                title={canSeek ? "Jump to this moment" : "No video position for this event"}
                className={cn(
                  "font-mono text-xs tabular-nums",
                  canSeek
                    ? "text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    : "text-muted-foreground/50"
                )}
              >
                {describeEventTime(
                  offsets,
                  event.video_offset_seconds,
                  event.period,
                  event.clock_seconds
                )}
              </button>

              <span className={cn("font-medium", TONE_TEXT[meta?.tone ?? "neutral"])}>
                {meta?.label ?? event.event_type}
              </span>

              {event.shot_origin && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {SHOT_ORIGIN_LABELS[event.shot_origin as ShotOrigin] ?? event.shot_origin}
                </span>
              )}

              {scoreLine && (
                <span className="text-xs tabular-nums text-muted-foreground">{scoreLine}</span>
              )}

              <span className="ml-auto flex items-center gap-2">
                {event.sync !== "saved" && (
                  <span
                    className={cn(
                      "text-[11px]",
                      event.sync === "failed" ? "text-status-critical" : "text-muted-foreground"
                    )}
                  >
                    {SYNC_HINT[event.sync]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setEditingNote(editingNote === event.id ? null : event.id)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {event.note ? "Edit note" : "Note"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(event.id)}
                  className="text-xs text-muted-foreground hover:text-status-critical"
                >
                  Delete
                </button>
              </span>
            </div>

            {event.note && editingNote !== event.id && (
              <p className="text-xs text-muted-foreground">{event.note}</p>
            )}

            {editingNote === event.id && (
              <input
                autoFocus
                defaultValue={event.note ?? ""}
                placeholder="What happened?"
                onBlur={(e) => {
                  onNote(event.id, e.target.value)
                  setEditingNote(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onNote(event.id, e.currentTarget.value)
                    setEditingNote(null)
                  }
                  if (e.key === "Escape") setEditingNote(null)
                }}
                className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
