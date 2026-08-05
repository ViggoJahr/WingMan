import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sparkline } from "@/components/charts/Sparkline"
import type { MetricReading } from "@/lib/services/metricBaseline"
import { Verdict } from "./Verdict"

/**
 * The reference's trend list, one row at a time.
 *
 * Reading order is the whole design: a muted icon and label say what this is,
 * an oversized numeral says where you are, a coloured line says whether that
 * is fine, and the sparkline on the right says how you got here. The label is
 * deliberately the quietest thing in the row - you already know you asked for
 * sleep, so the figure should be what your eye lands on.
 *
 * Server component. It takes an already-computed `MetricReading` rather than a
 * raw series so that the band behind the sparkline and the verdict under the
 * value cannot disagree - they are the same object.
 */

export interface MetricRowProps {
  icon: LucideIcon
  label: string
  reading: MetricReading
  /** Oldest first, aligned with whatever produced `reading`. */
  series: ReadonlyArray<number | null | undefined>
  /** Formats the figure. Receives the raw latest value. */
  format?: (value: number) => string
  /** Small trailing unit, set in the muted colour beside the numeral. */
  unit?: string
  /**
   * Replaces the verdict line for metrics that have no normal range by design.
   * Weekly load is the case this exists for: a rest day is a real zero rather
   * than a low reading, so a mean-and-spread band would be meaningless - and
   * the default "Building your range" would promise one that never arrives.
   */
  note?: string
  href?: string
  className?: string
}

export function MetricRow({
  icon: Icon,
  label,
  reading,
  series,
  format,
  unit,
  note,
  href,
  className,
}: MetricRowProps) {
  const { latest, baseline, deviation, tone } = reading
  const display = latest == null ? "-" : format ? format(latest) : String(latest)

  const body = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="truncate text-sm">{label}</span>
        </div>

        <p className="flex items-baseline gap-1.5">
          {/* Tabular figures because these rows stack, and proportional digits
              make a column of numbers visibly ragged down the left edge. */}
          <span className="font-heading text-3xl leading-none font-semibold tracking-tight tabular-nums">
            {display}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </p>

        {deviation ? (
          <Verdict deviation={deviation} label={reading.label} tone={tone} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {note ?? (latest == null ? "No data yet" : "Building your range")}
          </p>
        )}
      </div>

      <Sparkline
        values={series}
        band={baseline ? { low: baseline.low, high: baseline.high } : null}
        tone={tone === "neutral" ? "brand" : tone}
        // Hidden below the smallest phones: at that width the trace is under
        // 80px and reads as a scribble, and the row already states the value
        // and the verdict in words.
        className="hidden h-14 w-28 shrink-0 self-center xs:block sm:w-36"
      />

      {href && (
        <ArrowRight
          className="size-4 shrink-0 self-start text-muted-foreground transition-transform group-hover/metric:translate-x-0.5"
          aria-hidden
        />
      )}
    </>
  )

  const classes = cn(
    "group/metric flex items-stretch gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
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

/** Vertical rhythm for a stack of rows, so pages stop hand-rolling the gap. */
export function MetricList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex flex-col gap-2.5", className)}>{children}</div>
}
