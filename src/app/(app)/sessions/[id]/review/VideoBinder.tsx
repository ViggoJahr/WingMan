"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  getHandle,
  fileFromHandleIfPermitted,
  pickVideoFile,
  requestFileFromHandle,
  supportsFileSystemAccess,
  type VideoFileHandle,
} from "@/lib/video/handleStore"
import type { MatchVideoRow } from "./reviewTypes"

type BindState = "resolving" | "needs_permission" | "needs_pick" | "bound"

function formatSize(bytes: number | null): string {
  if (bytes == null) return ""
  const gb = bytes / 1_000_000_000
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1_000_000)} MB`
}

/**
 * Resolves the match video without making you re-navigate the filesystem every
 * visit. Postgres holds the identity and a handle_key; the actual
 * FileSystemFileHandle lives in IndexedDB under that key, so a return visit is
 * zero clicks when the grant survived and one click when it did not.
 */
export function VideoBinder({
  video,
  onPick,
  onResolved,
}: {
  video: MatchVideoRow | null
  /** A newly chosen file - the parent persists it and stores the handle. */
  onPick: (file: File, handle: VideoFileHandle | null) => void
  /** An already-bound file became playable. */
  onResolved: (file: File) => void
}) {
  const [state, setState] = useState<BindState>(video ? "resolving" : "needs_pick")
  const [warning, setWarning] = useState<string | null>(null)
  const handleRef = useRef<VideoFileHandle | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handles, IndexedDB and object URLs are all client-only, so resolution
  // happens in an effect rather than during render.
  useEffect(() => {
    let cancelled = false

    async function resolve() {
      if (!video?.handle_key) {
        setState(video?.url ? "bound" : "needs_pick")
        return
      }

      const handle = await getHandle(video.handle_key)
      if (cancelled) return

      if (!handle) {
        // Different machine, or storage was cleared. The row still knows what
        // file to look for.
        setState("needs_pick")
        return
      }

      handleRef.current = handle
      const file = await fileFromHandleIfPermitted(handle)
      if (cancelled) return

      if (file) {
        onResolved(file)
        setState("bound")
      } else {
        // requestPermission has to happen inside a user gesture, so all we can
        // do here is render a button.
        setState("needs_permission")
      }
    }

    void resolve()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.handle_key, video?.url])

  async function reopen() {
    const handle = handleRef.current
    if (!handle) return
    const file = await requestFileFromHandle(handle)
    if (file) {
      onResolved(file)
      setState("bound")
    } else {
      setState("needs_pick")
    }
  }

  async function choose() {
    const picked = await pickVideoFile()
    if (!picked) return
    onPick(picked.file, picked.handle)
    setState("bound")
  }

  function chooseFallback(file: File | undefined) {
    if (!file) return
    // Identity check only warns - a re-encoded or renamed copy of the same match
    // is still the right video, and refusing it would be worse than a nudge.
    if (video?.file_name && file.name !== video.file_name) {
      setWarning(`Expected "${video.file_name}" - attaching "${file.name}" instead.`)
    }
    onPick(file, null)
    setState("bound")
  }

  if (state === "bound") {
    return warning ? <p className="text-xs text-status-critical">{warning}</p> : null
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed p-6 text-center">
      {state === "resolving" && (
        <p className="text-sm text-muted-foreground">Looking for the video...</p>
      )}

      {state === "needs_permission" && (
        <>
          <p className="text-sm text-muted-foreground">
            Chrome needs permission to re-open{" "}
            <span className="font-medium text-foreground">{video?.file_name}</span>.
          </p>
          <Button type="button" onClick={reopen} className="mx-auto">
            Re-open video
          </Button>
        </>
      )}

      {state === "needs_pick" && (
        <>
          <p className="text-sm text-muted-foreground">
            {video?.file_name
              ? `This match was tagged against "${video.file_name}" ${formatSize(video.file_size_bytes)}. Pick it again to keep clipping.`
              : "Choose the match video. It stays on your machine - only the tags are stored."}
          </p>
          {supportsFileSystemAccess() ? (
            <Button type="button" onClick={choose} className="mx-auto">
              Choose video
            </Button>
          ) : (
            <>
              <Button type="button" onClick={() => inputRef.current?.click()} className="mx-auto">
                Choose video
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                hidden
                onChange={(event) => chooseFallback(event.target.files?.[0])}
              />
            </>
          )}
          {warning && <p className="text-xs text-status-critical">{warning}</p>}
        </>
      )}
    </div>
  )
}
