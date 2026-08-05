import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MetricReading } from "@/lib/services/metricBaseline"
import { RangeGauge } from "./RangeGauge"
import { Verdict } from "./Verdict"

/**
 * The compact half-width form: figure on the left, range capsule on the right.
 *
 * Same content as a MetricRow minus the history, for metrics you check rather
 * than track - is my resting HR where it usually is, yes or no. The reference
 * grids six of these under "Health Monitor" and it works because each one
 * answers a single question and none of them needs a chart to do it.
 */

export interface HealthTileProps {
  icon: LucideIcon
  label: string
  reading: MetricReading
  format?: (value: number) => string
  unit?: string
  href?: string
  className?: string
}

export function HealthTile({
  icon: Icon,
  label,
  reading,
  format,
  unit,
  href,
  className,
}: HealthTileProps) {
  const { latest, baseline, deviation, tone } = reading
  const display = latest == null ? "-" : format ? format(latest) : String(latest)

  const body = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="truncate text-sm">{label}</span>
        </div>

        <p className="flex items-baseline gap-1">
          <span className="font-heading text-2xl leading-none font-semibold tracking-tight tabular-nums">
            {display}
          </span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </p>

        {deviation ? (
          <Verdict
            deviation={deviation}
            label={reading.label}
            tone={tone}
            className="text-xs"
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            {latest == null ? "No data" : "Building range"}
          </p>
        )}
      </div>

      {latest != null && baseline && (
        <RangeGauge
          value={latest}
          band={{ low: baseline.low, high: baseline.high }}
          tone={tone}
          label={`${label}: ${display}${unit ? ` ${unit}` : ""}, ${reading.label ?? "no range yet"}`}
          className="self-center"
        />
      )}
    </>
  )

  const classes = cn(
    "flex gap-3 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10",
    href && "transition-colors hover:bg-accent",
    className
  )

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  )
}

/** Two up on a phone, three from `sm` - the reference grid, made responsive. */
export function HealthTileGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3", className)}>{children}</div>
  )
}
