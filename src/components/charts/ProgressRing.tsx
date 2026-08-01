import { cn } from "@/lib/utils"

/**
 * The moodboard's headline form: an arc, a big numeral, an uppercase label.
 *
 * Server-renderable on purpose - it is one SVG with no measurement and no
 * state, so it does not need to be a client component and does not go near the
 * Recharts animation problem that left every chart blank.
 *
 * The arc is drawn with stroke-dasharray on a circle rather than an arc path,
 * so there is no trigonometry to get wrong and the track and fill are the same
 * geometry.
 */

const SIZE = 120
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export type RingTone = "brand" | "good" | "warning" | "critical"

const TONE_STROKE: Record<RingTone, string> = {
  brand: "var(--brand-accent)",
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
}

export function ProgressRing({
  value,
  max = 100,
  label,
  display,
  caption,
  tone = "brand",
  className,
}: {
  value: number
  max?: number
  /** The uppercase micro-label under the numeral. */
  label: string
  /** What to show in the middle. Defaults to the rounded value. */
  display?: string
  /** Optional second line, e.g. a band name. */
  caption?: string
  tone?: RingTone
  className?: string
}) {
  // Clamped so an over-target value fills the ring rather than wrapping past
  // the top and reading as a smaller number than it is.
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const filled = CIRCUMFERENCE * fraction

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-28"
          role="img"
          aria-label={`${label}: ${display ?? Math.round(value)} out of ${max}`}
        >
          {/* -90deg so the arc starts at twelve o'clock. */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--track)"
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={TONE_STROKE[tone]}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-semibold tabular-nums">
            {display ?? Math.round(value)}
          </span>
          {caption && (
            <span className="text-[11px] leading-tight text-muted-foreground">{caption}</span>
          )}
        </div>
      </div>
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  )
}
