import Link from "next/link"
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sparkline } from "@/components/charts/Sparkline"
import { TONE_TEXT, type Tone } from "@/components/metrics/tone"

/**
 * The compact figure: label, value, one supporting line, and history.
 *
 * Sits between HealthTile (which answers "am I in range?") and MetricRow (which
 * is a row in a scannable list). This one is for figures with no meaningful
 * normal range - weekly load, an ACWR ratio - where the useful comparison is
 * against the previous period rather than against a band, which is what `delta`
 * carries.
 */

/** Kept as an alias so the six call sites that import it do not all churn. */
export type TileStatus = Tone

export interface StatTileProps {
  label: string
  value: string
  /** Makes the whole tile a link - every tile should lead somewhere useful. */
  href?: string
  /** Small caption under the value, e.g. an ACWR band name. */
  hint?: string
  status?: TileStatus
  /**
   * Percentage change against the previous equivalent period. `goodDirection`
   * decides whether an increase is coloured as an improvement; use "none" for
   * metrics where neither direction is inherently better (weight, load).
   */
  delta?: {
    percent: number
    goodDirection?: "up" | "down" | "none"
    periodLabel?: string
  }
  /** Raw values for a background sparkline, oldest first. */
  sparkline?: ReadonlyArray<number | null | undefined>
}

function Delta({
  percent,
  goodDirection = "none",
  periodLabel = "vs prev",
}: NonNullable<StatTileProps["delta"]>) {
  const rounded = Math.round(percent)
  // Sub-1% moves are noise; show them as flat rather than implying a trend.
  const direction = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat"
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : ArrowRight

  const tone =
    goodDirection === "none" || direction === "flat"
      ? "text-muted-foreground"
      : direction === goodDirection
        ? "text-status-good"
        : "text-status-critical"

  return (
    <span className={cn("flex items-center gap-0.5 text-[11px]", tone)}>
      <Icon className="size-3" aria-hidden />
      {rounded === 0 ? "0" : `${Math.abs(rounded)}`}%{" "}
      <span className="text-muted-foreground">{periodLabel}</span>
    </span>
  )
}

export function StatTile({
  label,
  value,
  href,
  hint,
  status = "neutral",
  delta,
  sparkline,
}: StatTileProps) {
  const body = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      {/* The figure is the point of the tile, so it is set at display size and
          the label above it is deliberately small - the previous version had
          them within one step of each other and the tile read as a form field. */}
      <p
        className={cn(
          "font-heading text-2xl leading-none font-semibold tracking-tight tabular-nums",
          status === "neutral" ? "text-foreground" : TONE_TEXT[status]
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>}
      {delta && <Delta {...delta} />}
      {sparkline && (
        <Sparkline
          values={sparkline}
          tone={status === "neutral" ? "brand" : status}
          className="mt-auto h-8 w-full pt-2"
        />
      )}
    </>
  )

  const className = cn(
    "flex flex-col gap-1.5 rounded-xl bg-card p-3.5 ring-1 ring-foreground/10",
    href && "transition-colors hover:bg-accent"
  )

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
