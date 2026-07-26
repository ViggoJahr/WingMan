"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { setManualRpe } from "@/app/(app)/sessions/[id]/actions"

// Borg 6-20 descriptors, collapsed to the handful of steps worth distinguishing
// after the fact. Asking "how hard was that, roughly" days later is only ever
// going to be approximate, so offering all 20 values would be false precision.
const CHOICES: Array<{ value: number; label: string; hint: string }> = [
  { value: 8, label: "Very easy", hint: "recovery, barely noticed it" },
  { value: 11, label: "Easy", hint: "comfortable, could talk freely" },
  { value: 13, label: "Moderate", hint: "working, but sustainable" },
  { value: 15, label: "Hard", hint: "breathing heavily, talking is an effort" },
  { value: 17, label: "Very hard", hint: "near maximal, couldn't hold it long" },
  { value: 19, label: "Maximal", hint: "everything I had" },
]

export function RpeQuickSet({
  sessionId,
  currentRpe,
  syncedRpe,
  compact = false,
}: {
  sessionId: string
  /** Existing manual_rpe, if any. */
  currentRpe: number | null
  /** RPE that came from the source, shown for context when it exists. */
  syncedRpe?: number | null
  compact?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<number | null>(currentRpe)
  const [error, setError] = useState<string | null>(null)

  function choose(value: number) {
    const next = selected === value ? null : value
    setSelected(next)
    setError(null)
    startTransition(async () => {
      try {
        await setManualRpe(sessionId, next)
      } catch (err) {
        setSelected(selected)
        setError(err instanceof Error ? err.message : "Couldn't save that.")
      }
    })
  }

  return (
    <div className={cn("flex flex-col gap-2", pending && "opacity-60")}>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          How hard did this feel?{" "}
          {syncedRpe != null && <span>Source reported RPE {syncedRpe}.</span>}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {CHOICES.map((choice) => (
          <button
            key={choice.value}
            type="button"
            onClick={() => choose(choice.value)}
            disabled={pending}
            title={`RPE ${choice.value} - ${choice.hint}`}
            aria-pressed={selected === choice.value}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              selected === choice.value
                ? "border-transparent bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {choice.label}
          </button>
        ))}
      </div>

      {selected != null && !compact && (
        <p className="text-xs text-muted-foreground">
          Saved as RPE {selected}. Tap again to clear.
        </p>
      )}
      {error && <p className="text-xs text-status-critical">{error}</p>}
    </div>
  )
}
