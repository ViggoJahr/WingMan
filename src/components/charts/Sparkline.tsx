import { cn } from "@/lib/utils"
import { TONE_SOFT, TONE_STROKE, type Tone } from "@/components/metrics/tone"

/**
 * A series, the band it usually sits in, and a lit dot on today.
 *
 * This is the reference design's most repeated form and the reason its trend
 * lists read so quickly: the shaded band is the athlete's own normal range, so
 * "is this high?" is answered by where the line sits inside the shading rather
 * than by reading an axis. There is deliberately no axis at all.
 *
 * Server-renderable - one SVG, no measurement, no state - so it can sit inside
 * the server components that already do the querying, the same reasoning as
 * ProgressRing.
 *
 * The trace is drawn in the metric's own colour and only the endpoint carries
 * the verdict colour. Colouring the whole line by verdict made a row flash red
 * across thirty days of history because of one reading today, which is exactly
 * the misreading the band is supposed to prevent.
 */

/** Both axes run 0-100 and the SVG is stretched to its box, so the geometry
 *  below is in percentages and needs no knowledge of the rendered size. */
const VIEW = 100

export interface SparklineProps {
  /** Oldest first. Nulls are gaps - days with no reading - and break the line. */
  values: ReadonlyArray<number | null | undefined>
  /** The normal range to shade. Omit for a bare trace. */
  band?: { low: number; high: number } | null
  /** Colours the endpoint dot, and the band when no separate trace tone is set. */
  tone?: Tone
  className?: string
  /** Falls back to hiding the chart from assistive tech, since it is decorative
   *  whenever the row already states the value and the verdict in text. */
  ariaLabel?: string
}

export function Sparkline({
  values,
  band,
  tone = "brand",
  className,
  ariaLabel,
}: SparklineProps) {
  const points = values.map((v) => (v != null && Number.isFinite(v) ? v : null))
  const finite = points.filter((v): v is number => v != null)
  if (finite.length < 2) return null

  // The band is part of the domain, not an overlay on it: if today's reading is
  // inside the band but the window's spread is tiny, a domain built from the
  // series alone would clip the shading and the row would claim "normal" over
  // a band you cannot see.
  const candidates = band ? [...finite, band.low, band.high] : finite
  const min = Math.min(...candidates)
  const max = Math.max(...candidates)
  // A flat series has no range to divide by; give it one so it draws down the
  // middle instead of collapsing onto the top edge.
  const range = max - min || 1

  const x = (i: number) => (i / (points.length - 1)) * VIEW
  const y = (v: number) => VIEW - ((v - min) / range) * VIEW

  // Split into runs of consecutive readings so a fortnight without the ring on
  // shows as a break rather than a straight line pretending to be data.
  const segments: string[] = []
  let run: string[] = []
  points.forEach((value, i) => {
    if (value == null) {
      if (run.length > 1) segments.push(run.join(" "))
      run = []
      return
    }
    run.push(`${x(i).toFixed(2)},${y(value).toFixed(2)}`)
  })
  if (run.length > 1) segments.push(run.join(" "))

  // Annotated because the accumulator would otherwise widen to the array's
  // `number | null` element type and defeat the null check below.
  const lastIndex = points.reduce<number>((last, v, i) => (v != null ? i : last), -1)
  const lastValue = lastIndex >= 0 ? points[lastIndex] : null

  const bandTop = band ? y(band.high) : 0
  const bandHeight = band ? y(band.low) - y(band.high) : 0

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        // Stretched rather than letterboxed so the trace fills whatever box the
        // row gives it. The dot is an HTML element for exactly this reason - a
        // <circle> under a non-uniform scale renders as an ellipse.
        preserveAspectRatio="none"
        className="size-full overflow-visible"
        role={ariaLabel ? "img" : undefined}
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
      >
        {band && bandHeight > 0 && (
          <rect
            x={0}
            y={bandTop}
            width={VIEW}
            height={bandHeight}
            fill={TONE_SOFT[tone]}
          />
        )}
        {segments.map((segment, i) => (
          <polyline
            key={i}
            points={segment}
            fill="none"
            stroke={TONE_STROKE.brand}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            // Keeps the stroke 1.5px wide despite the non-uniform scale, which
            // would otherwise squash it to a hairline in wide boxes.
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {lastValue != null && (
        <span
          aria-hidden
          className="glow absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${x(lastIndex)}%`,
            top: `${y(lastValue)}%`,
            backgroundColor: TONE_STROKE[tone],
            color: TONE_STROKE[tone],
          }}
        />
      )}
    </div>
  )
}
