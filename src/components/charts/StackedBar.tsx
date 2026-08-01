import { cn } from "@/lib/utils"

/**
 * A single horizontal bar split into labelled segments.
 *
 * Two things in this app are one whole divided into ordered parts - sleep
 * stages and heart-rate zones - and both were rendered as lines of plain text.
 * Neither needs Recharts: there is no axis, no scale and nothing to measure, so
 * this stays a server component and avoids the entrance-animation stall that
 * left every Recharts chart blank.
 *
 * Segments below `MIN_VISIBLE_FRACTION` are widened to it. A stage that lasted
 * ninety seconds is real information, and at true scale it renders as a
 * sub-pixel sliver that reads as absent - the legend carries the exact number.
 */
const MIN_VISIBLE_FRACTION = 0.02

export interface StackSegment {
  key: string
  label: string
  value: number
  /** Any CSS colour - callers pass a token or a color-mix. */
  fill: string
}

export function StackedBar({
  segments,
  formatValue,
  emptyMessage = "No detail recorded.",
  className,
}: {
  segments: readonly StackSegment[]
  /** Renders a segment's value in the legend and tooltip. */
  formatValue: (value: number) => string
  emptyMessage?: string
  className?: string
}) {
  const present = segments.filter((s) => s.value > 0)
  const total = present.reduce((sum, s) => sum + s.value, 0)

  if (total <= 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  const widths = present.map((s) => Math.max(s.value / total, MIN_VISIBLE_FRACTION))
  const widthTotal = widths.reduce((a, b) => a + b, 0)

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex h-6 w-full overflow-hidden rounded-md" role="img" aria-hidden>
        {present.map((segment, index) => (
          <div
            key={segment.key}
            title={`${segment.label}: ${formatValue(segment.value)}`}
            style={{
              width: `${(widths[index] / widthTotal) * 100}%`,
              backgroundColor: segment.fill,
            }}
          />
        ))}
      </div>

      <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {present.map((segment) => (
          <div key={segment.key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: segment.fill }}
            />
            <dt className="text-muted-foreground">{segment.label}</dt>
            <dd className="font-medium tabular-nums">{formatValue(segment.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
