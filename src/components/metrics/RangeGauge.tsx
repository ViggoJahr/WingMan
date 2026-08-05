import { cn } from "@/lib/utils"
import { TONE_STROKE, type Tone } from "./tone"

/**
 * A capsule showing where today's reading sits inside the athlete's own range.
 *
 * The reference puts one of these beside every health figure, and it is doing
 * more work than it looks: the filled section is the normal band, the marker is
 * now, and the distance between them is the entire message. A bar that filled
 * from zero to the value instead - the obvious reading of the shape - would
 * say nothing at all, because no one knows what a "full" HRV is.
 *
 * Vertical by default because that is how it sits in a two-column tile; the
 * horizontal form is for rows where a metric is broken into parts.
 */

/** Padding on the domain so a marker at an extreme is not clipped by the cap. */
const DOMAIN_PADDING = 0.08

export interface RangeGaugeProps {
  value: number
  /** The normal band to fill. Without it the gauge is just a marker on a track. */
  band?: { low: number; high: number } | null
  /** Domain ends. Defaults to the band widened by the distance to the value. */
  min?: number
  max?: number
  tone?: Tone
  orientation?: "vertical" | "horizontal"
  className?: string
  label?: string
}

export function RangeGauge({
  value,
  band,
  min,
  max,
  tone = "good",
  orientation = "vertical",
  className,
  label,
}: RangeGaugeProps) {
  // Derive a domain that always contains both the band and the reading, then
  // pad it - otherwise an out-of-range value pins to the cap and every
  // abnormal reading looks equally abnormal.
  const lo = Math.min(value, band?.low ?? value, band?.high ?? value)
  const hi = Math.max(value, band?.low ?? value, band?.high ?? value)
  const spread = hi - lo || Math.abs(value) || 1
  const domainMin = min ?? lo - spread * DOMAIN_PADDING
  const domainMax = max ?? hi + spread * DOMAIN_PADDING
  const domain = domainMax - domainMin || 1

  const fraction = (v: number) => Math.min(1, Math.max(0, (v - domainMin) / domain))

  const valueAt = fraction(value)
  const bandStart = band ? fraction(band.low) : 0
  const bandEnd = band ? fraction(band.high) : 0
  const bandSize = Math.max(bandEnd - bandStart, 0)

  const vertical = orientation === "vertical"

  return (
    <div
      className={cn(
        // Not overflow-hidden: the marker is wider than the track so that it
        // reads as a knob sitting on the scale rather than a bulge inside it,
        // and clipping it would flatten one side whenever a reading sits at an
        // extreme - which is exactly when the marker matters most.
        "relative shrink-0 rounded-full bg-surface-sunken",
        vertical ? "h-14 w-2" : "h-2 w-full",
        className
      )}
      role="img"
      aria-label={label}
    >
      {band && bandSize > 0 && (
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            // A 15% wash disappeared against the track at this width - the
            // capsule read as an empty thermometer with a dot balanced on it.
            // The band is the whole point of the control, so it is drawn as a
            // real fill and the marker earns its contrast from the ring below.
            backgroundColor: `color-mix(in oklab, ${TONE_STROKE[tone]} 38%, transparent)`,
            ...(vertical
              ? { left: 0, right: 0, bottom: `${bandStart * 100}%`, height: `${bandSize * 100}%` }
              : { top: 0, bottom: 0, left: `${bandStart * 100}%`, width: `${bandSize * 100}%` }),
          }}
        />
      )}

      <span
        aria-hidden
        className="glow-soft absolute size-2.5 rounded-full ring-2 ring-card"
        style={{
          backgroundColor: TONE_STROKE[tone],
          color: TONE_STROKE[tone],
          ...(vertical
            ? { left: "-0.125rem", bottom: `calc(${valueAt * 100}% - 0.3125rem)` }
            : { top: "-0.125rem", left: `calc(${valueAt * 100}% - 0.3125rem)` }),
        }}
      />
    </div>
  )
}
