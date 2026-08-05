import Link from "next/link"
import { addDays, format, isAfter, isSameMonth, startOfMonth, subMonths } from "date-fns"
import { cn } from "@/lib/utils"
import { formatValue, type ValueFormat } from "@/lib/valueFormat"

/**
 * Training days as calendar months, not as a contribution graph.
 *
 * This used to be the GitHub form - 26 columns of seven cells, weeks running
 * left to right. That shape is built for a year at desk width; on a phone it
 * became a horizontally scrolling strip of 11px squares with no month
 * structure, and the one question it was there to answer ("which days did I
 * actually train last week?") required counting columns backwards from the
 * right edge.
 *
 * The reference uses real month grids, and it is simply better here: a date has
 * a position you already know, weekends line up in a column, and it fits a
 * phone without scrolling. The trade is span - two or three months rather than
 * six - which is the right trade for a view whose job is recent rhythm.
 */

export interface HeatmapDay {
  /** yyyy-MM-dd */
  day: string
  value: number
  /** Marks the cell - used for match days. */
  marked?: boolean
  /**
   * An injury was open on this day. Rendered as a strikethrough bar rather than
   * a second colour: a light week means the opposite thing depending on whether
   * you were hurt, and without it the heatmap silently reads a lay-off as a
   * taper.
   */
  injured?: boolean
}

export interface ActivityHeatmapProps {
  days: HeatmapDay[]
  /** How many calendar months to render, ending with the current one. */
  months?: number
  /** How to render the value in each cell's hover tooltip. */
  valueFormat?: ValueFormat
  /** Shown next to the intensity legend, e.g. "training load". */
  metricLabel?: string
  markedLabel?: string
}

// Intensity ramp is relative to the athlete's own busiest day in the window,
// so it stays readable whether they're in pre-season or a taper week.
//
// This is a magnitude encoding, so it runs on one hue - the brand sage, faded
// toward the surface. Rest days use --track, the same "nothing here yet" value
// the progress rings use for their unfilled arc.
const LEVEL_FILL = [
  "var(--track)",
  "color-mix(in oklab, var(--brand-accent) 30%, transparent)",
  "color-mix(in oklab, var(--brand-accent) 55%, transparent)",
  "color-mix(in oklab, var(--brand-accent) 78%, transparent)",
  "var(--brand-accent)",
]

function levelFor(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0
  const ratio = value / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

/** Monday-first, matching the reference and every European league calendar. */
const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"]

/** date-fns getDay() is Sunday-first; shift so Monday is column 0. */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function MonthGrid({
  monthStart,
  byDay,
  max,
  today,
  valueFormat,
  metricLabel,
  markedLabel,
}: {
  monthStart: Date
  byDay: Map<string, HeatmapDay>
  max: number
  today: Date
  valueFormat: ValueFormat
  metricLabel: string
  markedLabel: string
}) {
  const cells: (Date | null)[] = Array.from({ length: mondayIndex(monthStart) }, () => null)
  let cursor = monthStart
  while (isSameMonth(cursor, monthStart)) {
    cells.push(cursor)
    cursor = addDays(cursor, 1)
  }

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-2 text-sm font-medium">{format(monthStart, "MMM yyyy")}</p>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_INITIALS.map((initial, i) => (
          <div
            key={i}
            className="text-center text-[10px] leading-4 text-muted-foreground/70"
            aria-hidden
          >
            {initial}
          </div>
        ))}

        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} aria-hidden />

          const key = format(date, "yyyy-MM-dd")
          const isFuture = isAfter(date, today)
          const isToday = key === format(today, "yyyy-MM-dd")

          if (isFuture) {
            // Rendered as an empty slot rather than omitted, so the grid keeps
            // its shape and the last row does not reflow as the month fills.
            return <div key={key} className="h-5 rounded-full bg-track/40" aria-hidden />
          }

          const cell = byDay.get(key) ?? { day: key, value: 0 }
          const level = levelFor(cell.value, max)
          const label = `${format(date, "EEE d MMM yyyy")}: ${
            cell.value > 0 ? formatValue(cell.value, valueFormat) : `no ${metricLabel}`
          }${cell.marked ? ` (${markedLabel.toLowerCase()})` : ""}${
            cell.injured ? " - injured" : ""
          }`

          return (
            <Link
              key={key}
              href={`/history?from=${key}&to=${key}`}
              title={label}
              aria-label={label}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "relative h-5 rounded-full transition-transform hover:scale-110",
                // Today is outlined rather than filled, so it reads as "here"
                // without competing with the intensity encoding.
                isToday && "ring-2 ring-brand ring-offset-1 ring-offset-card"
              )}
              style={{
                backgroundColor: LEVEL_FILL[level],
                outline: cell.marked ? "1.5px solid var(--chart-2)" : undefined,
                outlineOffset: "-1.5px",
              }}
            >
              {cell.injured && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-status-critical"
                />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function ActivityHeatmap({
  days,
  months = 2,
  valueFormat = { decimals: 0 },
  metricLabel = "activity",
  markedLabel = "Match",
}: ActivityHeatmapProps) {
  const byDay = new Map(days.map((d) => [d.day, d]))
  const today = new Date()
  const max = days.reduce((m, d) => Math.max(m, d.value), 0)

  const monthStarts = Array.from({ length: months }, (_, i) =>
    startOfMonth(subMonths(today, months - 1 - i))
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Stacked on a phone: two month grids side by side at 360px gives each
          one 22px columns, which is below the comfortable tap target. */}
      <div className="flex flex-col gap-5 xs:flex-row xs:gap-4">
        {monthStarts.map((monthStart) => (
          <MonthGrid
            key={monthStart.toISOString()}
            monthStart={monthStart}
            byDay={byDay}
            max={max}
            today={today}
            valueFormat={valueFormat}
            metricLabel={metricLabel}
            markedLabel={markedLabel}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>Less</span>
          {LEVEL_FILL.map((fill, i) => (
            <span
              key={i}
              className="h-3 w-4 rounded-full"
              style={{ backgroundColor: fill }}
              aria-hidden
            />
          ))}
          <span>More {metricLabel}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-4 rounded-full"
            style={{
              backgroundColor: "var(--muted)",
              outline: "1.5px solid var(--chart-2)",
              outlineOffset: "-1.5px",
            }}
            aria-hidden
          />
          <span>{markedLabel}</span>
        </div>
        {days.some((d) => d.injured) && (
          <div className="flex items-center gap-1.5">
            <span className="relative h-3 w-4 rounded-full bg-track" aria-hidden>
              <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-status-critical" />
            </span>
            <span>Injured</span>
          </div>
        )}
      </div>
    </div>
  )
}
