"use client"

import { useEffect, useImperativeHandle, useRef, type Ref } from "react"
import { cn } from "@/lib/utils"

// The only component that touches a raw <video>. Everything else in the review
// UI goes through VideoSurfaceHandle, so swapping in a YouTube IFrame player
// later (whose seekTo(seconds) maps 1:1 onto this) is a change confined here.

export interface VideoSurfaceHandle {
  seek(seconds: number): void
  nudge(deltaSeconds: number): void
  currentTime(): number
  play(): void
  pause(): void
  toggle(): void
  isPaused(): boolean
  duration(): number | null
}

export function VideoSurface({
  ref,
  file,
  url,
  onReady,
  onTimeUpdate,
  className,
}: {
  ref?: Ref<VideoSurfaceHandle>
  /** Local file chosen by the user. Takes precedence over `url`. */
  file?: File | null
  url?: string | null
  /** Fires once metadata is available, with the video duration in seconds. */
  onReady?: (durationSeconds: number) => void
  onTimeUpdate?: (seconds: number) => void
  className?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // The src is pushed onto the element rather than held in state: an object URL
  // leaks the whole file until revoked and a match is gigabytes, so create and
  // revoke have to be paired in one effect. This is the "update an external
  // system from React state" case effects exist for - routing it through
  // setState would only add a cascading render.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    if (file) {
      const objectUrl = URL.createObjectURL(file)
      el.src = objectUrl
      return () => {
        URL.revokeObjectURL(objectUrl)
        el.removeAttribute("src")
      }
    }

    if (url) {
      el.src = url
      return
    }

    el.removeAttribute("src")
  }, [file, url])

  useImperativeHandle(
    ref,
    (): VideoSurfaceHandle => ({
      seek(seconds) {
        const el = videoRef.current
        if (!el) return
        el.currentTime = Math.max(0, seconds)
      },
      nudge(deltaSeconds) {
        const el = videoRef.current
        if (!el) return
        el.currentTime = Math.max(0, el.currentTime + deltaSeconds)
      },
      currentTime: () => videoRef.current?.currentTime ?? 0,
      play: () => void videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      toggle() {
        const el = videoRef.current
        if (!el) return
        if (el.paused) void el.play()
        else el.pause()
      },
      isPaused: () => videoRef.current?.paused ?? true,
      duration() {
        const value = videoRef.current?.duration
        return value != null && Number.isFinite(value) ? value : null
      },
    }),
    []
  )

  // Always mounted so the ref exists for the effect above; collapsed until
  // something is actually bound.
  return (
    <video
      ref={videoRef}
      controls
      preload="metadata"
      className={cn("w-full rounded-md bg-black", !file && !url && "hidden", className)}
      onLoadedMetadata={(event) => {
        const duration = event.currentTarget.duration
        if (Number.isFinite(duration)) onReady?.(duration)
      }}
      onTimeUpdate={(event) => onTimeUpdate?.(event.currentTarget.currentTime)}
    />
  )
}
