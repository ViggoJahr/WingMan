"use client"

import { useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  COURT,
  COURT_ZONE_LABELS,
  clampCourtX,
  coordsToZone,
} from "@/lib/handball/zones"

/**
 * How far out the map is drawn, in metres. The court is 20m deep but nothing
 * useful is shot from beyond ~14, and a square map wastes half its height on
 * empty floor. Taps are clamped to this rather than to COURT.LENGTH.
 */
const MAP_DEPTH = 15

/** Goal at the top, court running down - the way you look at the attacking end. */
const VIEW_BOX = `${-COURT.HALF_WIDTH} 0 ${COURT.HALF_WIDTH * 2} ${MAP_DEPTH}`

const { GOAL_HALF_WIDTH: GP, GOAL_AREA_RADIUS: R6, FREE_THROW_RADIUS: R9 } = COURT

// Both lines are the same construction: a quarter-ish arc centred on each post,
// joined across the front. Sweep flag 0 because the arc runs anticlockwise in
// SVG's y-down space, which is what bulges it away from the goal.
const GOAL_AREA_PATH = `M ${-GP - R6} 0 A ${R6} ${R6} 0 0 0 ${-GP} ${R6} L ${GP} ${R6} A ${R6} ${R6} 0 0 0 ${GP + R6} 0`
const FREE_THROW_PATH = `M ${-GP - R9} 0 A ${R9} ${R9} 0 0 0 ${-GP} ${R9} L ${GP} ${R9} A ${R9} ${R9} 0 0 0 ${GP + R9} 0`

export interface CourtShot {
  id: string
  x: number
  y: number
  /** Drives the dot colour. Anything unrecognised reads as neutral. */
  outcome: string
}

/** Outcome -> fill. Uses status tokens, not chart colours: these are verdicts. */
const OUTCOME_FILL: Record<string, string> = {
  goal: "var(--status-good)",
  shot_saved: "var(--status-warning)",
  shot_missed: "var(--status-critical)",
}

function fillFor(outcome: string): string {
  return OUTCOME_FILL[outcome] ?? "var(--muted-foreground)"
}

export function CourtInput({
  shots,
  activeId,
  onPlace,
  disabled,
  className,
}: {
  shots: readonly CourtShot[]
  /** The event a tap will attach to. Its dot is drawn emphasised. */
  activeId?: string | null
  onPlace: (x: number, y: number) => void
  disabled?: boolean
  className?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  const handleClick = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg || disabled) return
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      // preserveAspectRatio is left at its default, but the wrapper fixes the
      // element's aspect ratio to the viewBox, so the mapping is linear.
      const fx = (clientX - rect.left) / rect.width
      const fy = (clientY - rect.top) / rect.height

      const x = clampCourtX(-COURT.HALF_WIDTH + fx * COURT.HALF_WIDTH * 2)
      const y = Math.min(MAP_DEPTH, Math.max(0, fy * MAP_DEPTH))
      onPlace(Math.round(x * 100) / 100, Math.round(y * 100) / 100)
    },
    [disabled, onPlace]
  )

  const active = shots.find((shot) => shot.id === activeId) ?? null

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted-foreground">Where from</span>
        <span className="text-muted-foreground">
          {active ? COURT_ZONE_LABELS[coordsToZone(active.x, active.y)] : "tap the court"}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={VIEW_BOX}
        role="img"
        aria-label="Handball court. Tap to place where the shot was taken."
        onClick={(event) => handleClick(event.clientX, event.clientY)}
        className={cn(
          "w-full rounded-lg border bg-card",
          disabled ? "pointer-events-none opacity-40" : "cursor-crosshair"
        )}
        style={{ aspectRatio: `${COURT.HALF_WIDTH * 2} / ${MAP_DEPTH}` }}
      >
        {/* Court floor, so the lines have something to sit on. */}
        <rect
          x={-COURT.HALF_WIDTH}
          y={0}
          width={COURT.HALF_WIDTH * 2}
          height={MAP_DEPTH}
          fill="var(--brand-muted)"
        />

        <path
          d={FREE_THROW_PATH}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          strokeDasharray="6 5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={GOAL_AREA_PATH}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />

        {/* Penalty mark. */}
        <line
          x1={-0.4}
          y1={COURT.PENALTY_Y}
          x2={0.4}
          y2={COURT.PENALTY_Y}
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />

        {/* The goal itself, on the goal line. */}
        <line
          x1={-GP}
          y1={0}
          x2={GP}
          y2={0}
          stroke="var(--foreground)"
          strokeWidth={4}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {shots.map((shot) => {
          const isActive = shot.id === activeId
          return (
            <circle
              key={shot.id}
              cx={shot.x}
              cy={shot.y}
              r={isActive ? 0.5 : 0.34}
              fill={fillFor(shot.outcome)}
              fillOpacity={isActive ? 1 : 0.65}
              stroke={isActive ? "var(--foreground)" : "none"}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>
    </div>
  )
}
