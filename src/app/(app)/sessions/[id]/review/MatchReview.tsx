"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { VideoSurface, type VideoSurfaceHandle } from "@/components/handball/VideoSurface"
import {
  CLIP_LEAD_IN_SECONDS,
  EVENT_TYPE_BY_KEY,
  SHOT_ORIGIN_BY_KEY,
  deriveBoxScore,
  type MatchEventType,
  type ShotOrigin,
} from "@/lib/handball/events"
import { formatVideoTime, videoTimeToClock, type PeriodOffsets } from "@/lib/handball/videoClock"
import { putHandle, type VideoFileHandle } from "@/lib/video/handleStore"
import type { MatchEventInput } from "@/lib/validation/schemas"
import {
  deleteMatchEvent,
  finishTagging,
  saveMatchEvents,
  setMatchVideo,
  setPeriodOffset,
} from "./actions"
import { EventList } from "./EventList"
import { TagPalette } from "./TagPalette"
import { VideoBinder } from "./VideoBinder"
import type { LocalEvent, MatchEventRow, MatchVideoRow } from "./reviewTypes"

const PERIODS = [1, 2] as const

/**
 * Where the scoreboard had got to when tagging last stopped. A score only ever
 * climbs, so the highest stored value is the resume point - and taking the max
 * mirrors how the match_box_score view derives the final score.
 *
 * Without this, reloading mid-match restarted the count at 0-0 and every event
 * tagged afterwards carried a score lower than the one already on screen.
 */
function resumeScore(events: MatchEventRow[], field: "score_us" | "score_them"): number {
  return events.reduce((highest, event) => Math.max(highest, event[field] ?? 0), 0)
}

/** Strips client-only fields before the event goes over the wire. */
function toInput(event: LocalEvent): MatchEventInput {
  return {
    id: event.id,
    session_id: event.session_id,
    video_id: event.video_id,
    event_type: event.event_type as MatchEventType,
    shot_origin: event.shot_origin as ShotOrigin | null,
    phase: null,
    video_offset_seconds: event.video_offset_seconds,
    period: event.period,
    clock_seconds: event.clock_seconds,
    score_us: event.score_us,
    score_them: event.score_them,
    position: null,
    court_x: event.court_x,
    court_y: event.court_y,
    goal_cell: event.goal_cell,
    note: event.note,
    source: "video",
  }
}

export function MatchReview({
  sessionId,
  opponent,
  isHome,
  startTime,
  video: initialVideo,
  initialEvents,
}: {
  sessionId: string
  opponent: string | null
  isHome: boolean | null
  startTime: string
  video: MatchVideoRow | null
  initialEvents: MatchEventRow[]
}) {
  const storageKey = `match-events:${sessionId}`
  const surfaceRef = useRef<VideoSurfaceHandle>(null)

  const [events, setEvents] = useState<LocalEvent[]>(() =>
    initialEvents.map((event) => ({ ...event, sync: "saved" as const }))
  )
  const [video, setVideo] = useState<MatchVideoRow | null>(initialVideo)
  const [file, setFile] = useState<File | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [pauseOnTag, setPauseOnTag] = useState(true)
  const [scoreUs, setScoreUs] = useState(() => resumeScore(initialEvents, "score_us"))
  const [scoreThem, setScoreThem] = useState(() => resumeScore(initialEvents, "score_them"))
  const [, startTransition] = useTransition()

  // Hoisted so the memo dependencies below name exactly what is read - the
  // React Compiler rejects a dep list narrower than what it infers.
  const videoId = video?.id ?? null
  const offsets = useMemo(() => ((video?.period_offsets as PeriodOffsets) ?? {}), [video])
  const boxScore = useMemo(() => deriveBoxScore(events), [events])
  const unsaved = events.filter((event) => event.sync !== "saved").length

  // ---- write queue -------------------------------------------------------
  // Per-event writes, not batch-on-save: an hour of tagging held only in client
  // memory is one tab crash from total loss. The uuid is minted on the client so
  // every write is an idempotent upsert and a retry cannot duplicate a goal.

  const queueRef = useRef(new Map<string, MatchEventInput>())
  const drainingRef = useRef(false)

  const persistPending = useCallback(
    (pending: LocalEvent[]) => {
      try {
        if (pending.length === 0) window.localStorage.removeItem(storageKey)
        else window.localStorage.setItem(storageKey, JSON.stringify(pending))
      } catch {
        // Private mode or a full quota - the server write is still the real path.
      }
    },
    [storageKey]
  )

  const drain = useCallback(() => {
    if (drainingRef.current) return
    drainingRef.current = true

    startTransition(async () => {
      try {
        // Coalesces whatever piled up while a request was in flight, so a burst
        // of five taps becomes one or two round trips rather than five.
        while (queueRef.current.size > 0) {
          const batch = [...queueRef.current.values()]
          queueRef.current.clear()
          const ids = new Set(batch.map((item) => item.id))
          try {
            await saveMatchEvents(sessionId, batch)
            setEvents((prev) =>
              prev.map((event) =>
                ids.has(event.id) ? { ...event, sync: "saved" as const } : event
              )
            )
          } catch {
            setEvents((prev) =>
              prev.map((event) =>
                ids.has(event.id) ? { ...event, sync: "failed" as const } : event
              )
            )
          }
        }
      } finally {
        drainingRef.current = false
      }
    })
  }, [sessionId])

  const enqueue = useCallback(
    (event: LocalEvent) => {
      queueRef.current.set(event.id, toInput(event))
      drain()
    },
    [drain]
  )

  // Mirror anything not yet acknowledged, so a crash mid-tagging is recoverable.
  useEffect(() => {
    persistPending(events.filter((event) => event.sync !== "saved"))
  }, [events, persistPending])

  // Recover a previous session's unsaved tags on mount.
  useEffect(() => {
    let stored: LocalEvent[] = []
    try {
      stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]")
    } catch {
      return
    }
    if (!Array.isArray(stored) || stored.length === 0) return

    const known = new Set(initialEvents.map((event) => event.id))
    const missing = stored.filter((event) => event?.id && !known.has(event.id))
    if (missing.length === 0) return

    // set-state-in-effect is disabled deliberately: localStorage does not exist
    // during SSR, so reading it in the useState initializer would render one
    // tree on the server and a different one on the client. A mount effect is
    // the only correct place, and it runs once - there is no cascade to avoid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvents((prev) => [...prev, ...missing.map((e) => ({ ...e, sync: "failed" as const }))])
    for (const event of missing) queueRef.current.set(event.id, toInput(event))
    drain()
    // Mount only - initialEvents is the server snapshot this page loaded with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- tagging -----------------------------------------------------------

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const at = a.video_offset_seconds ?? Number.POSITIVE_INFINITY
        const bt = b.video_offset_seconds ?? Number.POSITIVE_INFINITY
        return at - bt
      }),
    [events]
  )

  const tag = useCallback(
    (type: MatchEventType) => {
      // The <video> is always mounted (the ref has to exist for its src effect),
      // so currentTime() answers 0 even with nothing loaded. Without this guard
      // an untagged-video event would claim to happen at 0:00 and offer a seek.
      const hasVideo = file != null || video?.kind === "url"
      const at = hasVideo ? (surfaceRef.current?.currentTime() ?? null) : null
      const clock = at != null ? videoTimeToClock(offsets, at) : null
      const nextUs = type === "goal" ? scoreUs + 1 : scoreUs
      if (type === "goal") setScoreUs(nextUs)

      const event: LocalEvent = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        video_id: videoId,
        event_type: type,
        shot_origin: null,
        phase: null,
        video_offset_seconds: at,
        period: clock?.period ?? null,
        clock_seconds: clock?.clockSeconds ?? null,
        score_us: nextUs,
        score_them: scoreThem,
        position: null,
        court_x: null,
        court_y: null,
        goal_cell: null,
        note: null,
        source: "video",
        created_at: new Date().toISOString(),
        sync: "pending",
      }

      setEvents((prev) => [...prev, event])
      setActiveId(event.id)
      enqueue(event)
      if (pauseOnTag) surfaceRef.current?.pause()
    },
    [enqueue, file, offsets, pauseOnTag, scoreThem, scoreUs, sessionId, video, videoId]
  )

  const patchEvent = useCallback(
    (id: string, patch: Partial<LocalEvent>) => {
      setEvents((prev) => {
        const next = prev.map((event) =>
          event.id === id ? { ...event, ...patch, sync: "pending" as const } : event
        )
        const updated = next.find((event) => event.id === id)
        if (updated) enqueue(updated)
        return next
      })
    },
    [enqueue]
  )

  const removeEvent = useCallback(
    (id: string) => {
      queueRef.current.delete(id)
      setEvents((prev) => prev.filter((event) => event.id !== id))
      setActiveId((prev) => (prev === id ? null : prev))
      startTransition(async () => {
        try {
          await deleteMatchEvent(sessionId, id)
        } catch {
          // Already gone server-side, or offline. The row is out of the list
          // either way; a reload reconciles.
        }
      })
    },
    [sessionId]
  )

  const seekTo = useCallback((event: LocalEvent) => {
    if (event.video_offset_seconds == null) return
    surfaceRef.current?.seek(Math.max(0, event.video_offset_seconds - CLIP_LEAD_IN_SECONDS))
    surfaceRef.current?.play()
    setActiveId(event.id)
  }, [])

  // ---- video binding -----------------------------------------------------

  const bindFile = useCallback(
    async (picked: File, handle: VideoFileHandle | null) => {
      setFile(picked)
      const bound = await setMatchVideo(sessionId, {
        kind: "local_file",
        file_name: picked.name,
        file_size_bytes: picked.size,
        label: null,
        url: null,
        duration_seconds: null,
      })
      if (handle) await putHandle(bound.handleKey, handle)
      setVideo((prev) =>
        prev
          ? { ...prev, id: bound.id, handle_key: bound.handleKey, file_name: picked.name }
          : ({
              id: bound.id,
              session_id: sessionId,
              handle_key: bound.handleKey,
              file_name: picked.name,
              file_size_bytes: picked.size,
              kind: "local_file",
              label: null,
              url: null,
              duration_seconds: null,
              period_offsets: {},
              created_at: new Date().toISOString(),
            } as MatchVideoRow)
      )
    },
    [sessionId]
  )

  const anchorPeriod = useCallback(
    (period: number) => {
      const at = surfaceRef.current?.currentTime()
      if (at == null || !videoId) return
      setVideo((prev) =>
        prev
          ? { ...prev, period_offsets: { ...(prev.period_offsets as PeriodOffsets), [period]: at } }
          : prev
      )
      startTransition(async () => {
        try {
          await setPeriodOffset(sessionId, videoId, period, at)
        } catch {
          // Offsets are cheap to re-set; the next press overwrites.
        }
      })
    },
    [sessionId, videoId]
  )

  // ---- keyboard ----------------------------------------------------------

  useEffect(() => {
    function onKey(keyEvent: KeyboardEvent) {
      if (keyEvent.metaKey || keyEvent.ctrlKey || keyEvent.altKey) return

      const el = document.activeElement as HTMLElement | null
      if (
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
      ) {
        return
      }

      const surface = surfaceRef.current
      const key = keyEvent.key
      const active = events.find((event) => event.id === activeId)

      const eventType = EVENT_TYPE_BY_KEY[key.toLowerCase()]
      if (eventType) {
        keyEvent.preventDefault()
        tag(eventType)
        return
      }

      const origin = SHOT_ORIGIN_BY_KEY[key]
      if (origin && active) {
        keyEvent.preventDefault()
        patchEvent(active.id, { shot_origin: origin })
        return
      }

      switch (key) {
        case " ":
          keyEvent.preventDefault()
          surface?.toggle()
          break
        case "ArrowLeft":
          keyEvent.preventDefault()
          surface?.nudge(-5)
          break
        case "ArrowRight":
          keyEvent.preventDefault()
          surface?.nudge(5)
          break
        case "j":
          surface?.nudge(-10)
          break
        case "l":
          surface?.nudge(10)
          break
        case ",":
          surface?.nudge(-0.2)
          break
        case ".":
          surface?.nudge(0.2)
          break
        case "n":
          if (active) {
            keyEvent.preventDefault()
            setEditingNote(active.id)
          }
          break
        case "Backspace":
          if (active) {
            keyEvent.preventDefault()
            removeEvent(active.id)
          }
          break
        case "[":
          if (active?.video_offset_seconds != null) {
            patchEvent(active.id, {
              video_offset_seconds: Math.max(0, active.video_offset_seconds - 1),
            })
          }
          break
        case "]":
          if (active?.video_offset_seconds != null) {
            patchEvent(active.id, { video_offset_seconds: active.video_offset_seconds + 1 })
          }
          break
        case "u":
          setScoreUs((prev) => prev + 1)
          break
        case "i":
          setScoreThem((prev) => prev + 1)
          break
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [activeId, events, patchEvent, removeEvent, tag])

  const activeEvent = events.find((event) => event.id === activeId) ?? null

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">
            {opponent ? `vs ${opponent}` : "Match review"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(startTime).toLocaleDateString()} - {isHome ? "Home" : "Away"} -{" "}
            {events.length} event{events.length === 1 ? "" : "s"}
            {unsaved > 0 && (
              <span className="text-status-critical"> - {unsaved} unsaved</span>
            )}
          </p>
        </div>
        <form action={finishTagging.bind(null, sessionId)}>
          <Button type="submit" variant="outline">
            Done tagging
          </Button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-3">
          <VideoBinder video={video} onPick={bindFile} onResolved={setFile} />

          <VideoSurface
            ref={surfaceRef}
            file={file}
            url={video?.kind === "url" ? video.url : null}
          />

          {file && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Anchor throw-off:</span>
              {PERIODS.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => anchorPeriod(period)}
                  className={cn(
                    "rounded-md border px-2 py-1 transition-colors hover:bg-accent",
                    offsets[String(period)] != null && "border-status-good/50 text-status-good"
                  )}
                >
                  Period {period}
                  {offsets[String(period)] != null && (
                    <span className="ml-1 font-mono">
                      {formatVideoTime(offsets[String(period)])}
                    </span>
                  )}
                </button>
              ))}
              <label className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={pauseOnTag}
                  onChange={(e) => setPauseOnTag(e.target.checked)}
                />
                Pause on tag
              </label>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Tag
                <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
                  {scoreUs}-{scoreThem} (u / i to adjust)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TagPalette
                onTag={tag}
                onSetOrigin={(origin) =>
                  activeEvent && patchEvent(activeEvent.id, { shot_origin: origin })
                }
                activeOrigin={activeEvent?.shot_origin}
                hasActive={activeEvent != null}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Box score</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-4">
                {(
                  [
                    ["Goals", boxScore.goals],
                    ["Assists", boxScore.assists],
                    ["Missed", boxScore.shots_missed],
                    ["Saved", boxScore.shots_saved],
                    ["9m", boxScore.nine_m_shots],
                    ["Breakthr.", boxScore.breakthroughs],
                    ["Tech faults", boxScore.technical_faults],
                    ["Steals", boxScore.steals],
                    ["Blocks", boxScore.blocks],
                    ["2min won", boxScore.suspensions_created],
                    ["2min agst", boxScore.suspensions_received],
                    ["Mistakes", boxScore.big_mistakes],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Clips</CardTitle>
            </CardHeader>
            <CardContent>
              <EventList
                events={sortedEvents}
                activeId={activeId}
                offsets={offsets}
                seekable={file != null || video?.kind === "url"}
                editingNote={editingNote}
                onEditingNoteChange={setEditingNote}
                onSeek={seekTo}
                onDelete={removeEvent}
                onNote={(id, note) => patchEvent(id, { note: note.trim() || null })}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
