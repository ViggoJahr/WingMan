"use client"

import { useState, useTransition } from "react"
import { cn } from "@/lib/utils"
import { CHIP_BASE, CHIP_OFF, CHIP_ON } from "@/components/forms/ChipGroup"
import { RPE_CHOICES } from "@/lib/rpe"
import { setManualRpe } from "@/app/(app)/sessions/[id]/actions"

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
        {RPE_CHOICES.map((choice) => (
          <button
            key={choice.value}
            type="button"
            onClick={() => choose(choice.value)}
            disabled={pending}
            title={`RPE ${choice.value} - ${choice.hint}`}
            aria-pressed={selected === choice.value}
            className={cn(CHIP_BASE, selected === choice.value ? CHIP_ON : CHIP_OFF)}
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
