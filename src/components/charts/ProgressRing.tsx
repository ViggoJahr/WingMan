import { cn } from "@/lib/utils"
import { TONE_STROKE, type Tone } from "@/components/metrics/tone"

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
 *
 * Two things separate this from a bent progress bar, and both come from the
 * reference: the stroke runs as a gradient between two lightnesses of one hue
 * so the arc has a near end and a far end, and it glows. Without the gradient
 * the ring reads flat at any size; without the glow it does not look lit, and
 * "lit" is the entire visual argument of the reference's home screen.
 */

const SIZE = 120
const RADIUS = (SIZE - 10) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export type RingTone = Tone

/**
 * Deterministic per tone rather than per instance. The definition for a given
 * tone is byte-identical wherever it appears, so colliding ids across three
 * rings on one page resolve to the same gradient - which is the intent - and
 * there is no `useId`, which a server component cannot call anyway.
 */
const gradientId = (tone: RingTone) => `ring-gradient-${tone}`

/** The far end of the arc, lighter than the near end. */
const TONE_BRIGHT: Record<RingTone, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
  neutral: "var(--muted-foreground)",
  brand: "var(--brand-bright)",
}

const RING_SIZE = {
  sm: "size-20",
  md: "size-28",
  lg: "size-36",
} as const

const NUMERAL_SIZE = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
} as const

export function ProgressRing({
  value,
  max = 100,
  label,
  display,
  caption,
  tone = "brand",
  size = "md",
  strokeWidth = 10,
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
  size?: keyof typeof RING_SIZE
  strokeWidth?: number
  className?: string
}) {
  // Clamped so an over-target value fills the ring rather than wrapping past
  // the top and reading as a smaller number than it is.
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const filled = CIRCUMFERENCE * fraction
  const id = gradientId(tone)

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={cn(RING_SIZE[size], "overflow-visible")}
          role="img"
          aria-label={`${label}: ${display ?? Math.round(value)} out of ${max}`}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={TONE_STROKE[tone]} />
              <stop offset="100%" stopColor={TONE_BRIGHT[tone]} />
            </linearGradient>
          </defs>

          {/* -90deg so the arc starts at twelve o'clock. */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--track)"
              strokeWidth={strokeWidth}
            />
            {fraction > 0 && (
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={`url(#${id})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
                // `color` feeds the glow utility's currentColor, so the halo
                // matches the arc without repeating the value.
                style={{ color: TONE_BRIGHT[tone] }}
                className="glow-soft"
              />
            )}
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-heading leading-none font-semibold tracking-tight tabular-nums",
              NUMERAL_SIZE[size]
            )}
          >
            {display ?? Math.round(value)}
          </span>
          {caption && (
            <span className="mt-1 text-[11px] leading-tight text-muted-foreground">{caption}</span>
          )}
        </div>
      </div>
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  )
}

/**
 * The reference's home-screen header: three rings on one card, hairline-divided.
 *
 * Grouped rather than gridded so the dividers land between rings at any width,
 * and so a page with only two meaningful rings does not leave a hole where the
 * third would be.
 */
export function RingGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-around gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        "*:flex-1 *:border-l *:first:border-l-0",
        className
      )}
    >
      {children}
    </div>
  )
}
