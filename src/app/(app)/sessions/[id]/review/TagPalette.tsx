"use client"

import { cn } from "@/lib/utils"
import {
  EVENT_META,
  PALETTE_EVENT_TYPES,
  SHOT_ORIGINS,
  SHOT_ORIGIN_LABELS,
  type MatchEventType,
  type ShotOrigin,
} from "@/lib/handball/events"

const TONE_CLASS: Record<string, string> = {
  good: "border-status-good/40 hover:bg-status-good/10 hover:text-status-good",
  bad: "border-status-critical/40 hover:bg-status-critical/10 hover:text-status-critical",
  neutral: "hover:bg-accent",
}

const GROUP_LABEL: Record<string, string> = {
  shot: "Shots",
  play: "Play",
  discipline: "Discipline",
}

/**
 * Every tag is optional - like XPS, the palette is wide and you use whichever
 * parts of it you care about on a given match. Only event_type is ever required.
 */
export function TagPalette({
  onTag,
  onSetOrigin,
  activeOrigin,
  hasActive,
  disabled,
}: {
  onTag: (type: MatchEventType) => void
  onSetOrigin: (origin: ShotOrigin) => void
  activeOrigin?: string | null
  /** Origin applies to the last-tagged event, so it is dead until one exists. */
  hasActive: boolean
  disabled?: boolean
}) {
  const groups = ["shot", "play", "discipline"] as const

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group} className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">{GROUP_LABEL[group]}</p>
          <div className="flex flex-wrap gap-1.5">
            {PALETTE_EVENT_TYPES.filter((type) => EVENT_META[type].group === group).map((type) => {
              const meta = EVENT_META[type]
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  onClick={() => onTag(type)}
                  title={`${meta.label} (${meta.key})`}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors disabled:opacity-40",
                    TONE_CLASS[meta.tone]
                  )}
                >
                  {meta.label}
                  <kbd className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                    {meta.key}
                  </kbd>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          Shot origin{" "}
          <span className="font-normal">
            {hasActive ? "- applies to the last tag" : "- tag something first"}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SHOT_ORIGINS.map((origin, index) => (
            <button
              key={origin}
              type="button"
              disabled={disabled || !hasActive}
              onClick={() => onSetOrigin(origin)}
              aria-pressed={activeOrigin === origin}
              title={`${SHOT_ORIGIN_LABELS[origin]} (${index + 1})`}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40",
                activeOrigin === origin
                  ? "border-transparent bg-primary font-medium text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {SHOT_ORIGIN_LABELS[origin]}
              <kbd className="rounded bg-muted px-1 text-[10px]">{index + 1}</kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
