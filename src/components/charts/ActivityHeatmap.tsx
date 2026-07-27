import Link from "next/link"
import { addDays, format, isAfter, startOfWeek } from "date-fns"
import { formatValue, type ValueFormat } from "@/lib/valueFormat"

export interface HeatmapDay {
  /** yyyy-MM-dd */
  day: string
  value: number
  /** Draws a ring around the cell - used for match days. */
  marked?: boolean
}

export interface ActivityHeatmapProps {
  days: HeatmapDay[]
  /** Number of week columns to render. */
  weeks?: number
  /** How to render the value in each cell's hover tooltip. */
  valueFormat?: ValueFormat
  /** Shown next to the intensity legend, e.g. "training load". */
  metricLabel?: string
  /** Ring colour for marked days. */
  markedLabel?: string
}

// Intensity ramp is relative to the athlete's own busiest day in the window,
// so it stays readable whether they're in pre-season or a taper week.
const LEVEL_FILL = [
  "var(--muted)",
  "color-mix(in oklab, var(--chart-3) 28%, transparent)",
  "color-mix(in oklab, var(--chart-3) 52%, transparent)",
  "color-mix(in oklab, var(--chart-3) 76%, transparent)",
  "var(--chart-3)",
]

function levelFor(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0
  const ratio = value / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"]

export function ActivityHeatmap({
  days,
  weeks = 26,
  valueFormat = { decimals: 0 },
  metricLabel = "activity",
  markedLabel = "Match",
}: ActivityHeatmapProps) {
  const byDay = new Map(days.map((d) => [d.day, d]))
  const today = new Date()
  const firstColumn = startOfWeek(addDays(today, -(weeks * 7 - 1)), { weekStartsOn: 1 })

  const columns: (HeatmapDay | null)[][] = []
  let cursor = firstColumn
  while (!isAfter(cursor, today)) {
    const column: (HeatmapDay | null)[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(cursor, i)
      if (isAfter(date, today)) {
        column.push(null)
        continue
      }
      const key = format(date, "yyyy-MM-dd")
      column.push(byDay.get(key) ?? { day: key, value: 0 })
    }
    columns.push(column)
    cursor = addDays(cursor, 7)
  }

  const max = days.reduce((m, d) => Math.max(m, d.value), 0)

  // Label a column with its month name only when the month changes, which is
  // what makes the axis readable rather than repetitive.
  const monthLabels = columns.map((column, i) => {
    const first = column.find((c) => c != null)
    if (!first) return null
    const month = format(new Date(`${first.day}T00:00:00`), "MMM")
    if (i === 0) return month
    const prev = columns[i - 1].find((c) => c != null)
    if (!prev) return null
    return format(new Date(`${prev.day}T00:00:00`), "MMM") === month ? null : month
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto pb-1">
        <div className="flex w-max gap-1">
          <div className="flex flex-col gap-[3px] pt-[18px] pr-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="h-[11px] text-[9px] leading-[11px] text-muted-foreground"
                aria-hidden
              >
                {label}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {columns.map((column, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-[3px]">
                <div className="h-[14px] text-[9px] leading-[14px] text-muted-foreground" aria-hidden>
                  {monthLabels[colIndex]}
                </div>
                {column.map((cell, rowIndex) => {
                  if (!cell) {
                    return <div key={rowIndex} className="size-[11px]" aria-hidden />
                  }
                  const level = levelFor(cell.value, max)
                  const label = `${format(new Date(`${cell.day}T00:00:00`), "EEE d MMM yyyy")}: ${
                    cell.value > 0
                      ? formatValue(cell.value, valueFormat)
                      : `no ${metricLabel}`
                  }${cell.marked ? ` (${markedLabel.toLowerCase()})` : ""}`

                  return (
                    <Link
                      key={rowIndex}
                      href={`/history?from=${cell.day}&to=${cell.day}`}
                      title={label}
                      aria-label={label}
                      className="size-[11px] rounded-[2px] transition-transform hover:scale-125"
                      style={{
                        backgroundColor: LEVEL_FILL[level],
                        outline: cell.marked ? "1.5px solid var(--chart-2)" : undefined,
                        outlineOffset: "-1.5px",
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>Less</span>
          {LEVEL_FILL.map((fill, i) => (
            <span
              key={i}
              className="size-[11px] rounded-[2px]"
              style={{ backgroundColor: fill }}
              aria-hidden
            />
          ))}
          <span>More {metricLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="size-[11px] rounded-[2px]"
            style={{
              backgroundColor: "var(--muted)",
              outline: "1.5px solid var(--chart-2)",
              outlineOffset: "-1.5px",
            }}
            aria-hidden
          />
          <span>{markedLabel}</span>
        </div>
      </div>
    </div>
  )
}
