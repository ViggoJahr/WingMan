import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MetricReading } from "@/lib/services/metricBaseline"
import { Verdict } from "./Verdict"

/**
 * The top of a detail view: one number, at the size the page is about it.
 *
 * The reference gives every drill-down this header, and the reason it works is
 * restraint - the figure, the date it belongs to, the verdict, and the range
 * that verdict was measured against. Four things. Everything else on the screen
 * is below the chart.
 *
 * The range on the right is not decoration: it is the band the sparklines and
 * gauges elsewhere in the app are shading, stated in plain numbers for the one
 * screen where you have come to look closely.
 */
export function MetricHero({
  icon: Icon,
  label,
  reading,
  format,
  unit,
  caption,
  className,
}: {
  icon?: LucideIcon
  label?: string
  reading: MetricReading
  format?: (value: number) => string
  unit?: string
  /** Usually the date the figure belongs to. */
  caption?: string
  className?: string
}) {
  const { latest, baseline, deviation, tone } = reading
  const display = latest == null ? "-" : format ? format(latest) : String(latest)
  const render = (value: number) => (format ? format(value) : String(Math.round(value)))

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {label && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
            <span className="text-sm">{label}</span>
          </div>
        )}
        <p className="flex items-baseline gap-2">
          <span className="font-heading text-5xl leading-none font-semibold tracking-tight tabular-nums">
            {display}
          </span>
          {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
        </p>
        {caption && <p className="text-sm text-muted-foreground">{caption}</p>}
      </div>

      <div className="flex flex-col items-end gap-1">
        <Verdict deviation={deviation} label={reading.label} tone={tone} />
        {baseline && (
          <p className="text-sm text-muted-foreground tabular-nums">
            Your range {render(baseline.low)} - {render(baseline.high)}
          </p>
        )}
      </div>
    </div>
  )
}
