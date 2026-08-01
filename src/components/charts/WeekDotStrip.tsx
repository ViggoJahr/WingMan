import { cn } from "@/lib/utils"

/**
 * M T W T F S S with a marker per day - the compact weekly form from the
 * moodboard.
 *
 * This fits `daily_facts` particularly well: the view generates a full
 * calendar, so a rest day is a real row with zero load rather than a gap. The
 * strip can therefore distinguish "nothing happened" from "no data", which a
 * chart built from only the rows that exist cannot.
 */

/**
 * Derived from the date rather than assuming the window starts on a Monday, so
 * a trailing seven days lines up with the right letters.
 */
function dayInitial(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })
}

export interface DayMark {
  /** ISO date. Drives both the weekday letter and the tooltip. */
  date: string
  /** 0 = nothing, 1 = light, 2 = solid. Null means the day has no data at all. */
  level: 0 | 1 | 2 | null
  /** Tooltip text, e.g. "Mon 28 Jul - load 42". */
  title?: string
}

/**
 * The three levels have to be told apart at a glance, which rules out
 * --brand-muted for the light step: at 18% alpha against --track's 12% the two
 * were indistinguishable, so a rest day and a light day looked identical and
 * the strip conveyed nothing.
 */
const LEVEL_CLASS: Record<string, string> = {
  none: "bg-track",
  light: "bg-brand/40",
  solid: "bg-brand",
  missing: "border border-dashed border-border bg-transparent",
}

function levelClass(level: DayMark["level"]): string {
  if (level == null) return LEVEL_CLASS.missing
  if (level === 0) return LEVEL_CLASS.none
  if (level === 1) return LEVEL_CLASS.light
  return LEVEL_CLASS.solid
}

export function WeekDotStrip({
  days,
  label,
  className,
}: {
  /** Seven days, oldest first. */
  days: readonly DayMark[]
  label?: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      )}
      <div className="flex gap-1.5">
        {days.slice(0, 7).map((day) => (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
            <span
              title={day.title}
              className={cn("h-6 w-full rounded-sm", levelClass(day.level))}
            />
            <span className="text-[10px] text-muted-foreground">{dayInitial(day.date)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
