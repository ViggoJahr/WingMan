import Link from "next/link"
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

export type TileStatus = "good" | "warning" | "critical" | "neutral"

const STATUS_TEXT: Record<TileStatus, string> = {
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
  neutral: "text-foreground",
}

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
  sparkline?: number[]
}

function Sparkline({ values }: { values: number[] }) {
  const usable = values.filter((v) => Number.isFinite(v))
  if (usable.length < 2) return null

  const min = Math.min(...usable)
  const max = Math.max(...usable)
  const range = max - min || 1
  const width = 100
  const height = 24

  const points = usable
    .map((v, i) => {
      const x = (i / (usable.length - 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="mt-1 h-6 w-full"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--brand-accent)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function Delta({ percent, goodDirection = "none", periodLabel = "vs prev" }: NonNullable<StatTileProps["delta"]>) {
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
      {rounded === 0 ? "0" : `${Math.abs(rounded)}`}% <span className="text-muted-foreground">{periodLabel}</span>
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
      <p className={cn("text-xl font-semibold tabular-nums", STATUS_TEXT[status])}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {delta && <Delta {...delta} />}
      {sparkline && <Sparkline values={sparkline} />}
    </>
  )

  const className = cn(
    "flex flex-col justify-start rounded-md border p-3",
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
