"use client"

import { useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { GOAL_CELL_LABELS, OFF_TARGET, goalCellFromFraction, goalCellPosition } from "@/lib/handball/zones"

// Goal is 3m x 2m, drawn in centimetres so the numbers stay integers. The band
// around it is the off-target target: a shot that missed the frame happened
// somewhere, and pointing at roughly where is one gesture rather than hunting
// for a separate button.
const GOAL_W = 300
const GOAL_H = 200
const BAND = 46

const VIEW_BOX = `${-BAND} ${-BAND} ${GOAL_W + BAND * 2} ${GOAL_H + BAND * 2}`

export interface GoalPlacement {
  id: string
  cell: number
  outcome: string
}

const OUTCOME_FILL: Record<string, string> = {
  goal: "var(--status-good)",
  shot_saved: "var(--status-warning)",
  shot_missed: "var(--status-critical)",
}

function fillFor(outcome: string): string {
  return OUTCOME_FILL[outcome] ?? "var(--muted-foreground)"
}

/** Centre of a cell, for drawing a stored placement back onto the grid. */
function cellCentre(cell: number): { cx: number; cy: number } | null {
  const position = goalCellPosition(cell)
  if (!position) return null
  return {
    cx: (position.column + 0.5) * (GOAL_W / 3),
    cy: (position.rowFromTop + 0.5) * (GOAL_H / 3),
  }
}

export function GoalGridInput({
  placements,
  activeId,
  activeCell,
  onPlace,
  disabled,
  className,
}: {
  placements: readonly GoalPlacement[]
  activeId?: string | null
  /** Cell already on the active event, highlighted so it reads as set. */
  activeCell?: number | null
  onPlace: (cell: number) => void
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

      // Fractions across the whole element, then converted into goal-relative
      // fractions so the surrounding band comes out as <0 or >1.
      const totalW = GOAL_W + BAND * 2
      const totalH = GOAL_H + BAND * 2
      const fx = (((clientX - rect.left) / rect.width) * totalW - BAND) / GOAL_W
      const fy = (((clientY - rect.top) / rect.height) * totalH - BAND) / GOAL_H

      const inFrame = fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1
      onPlace(inFrame ? goalCellFromFraction(fx, fy) : OFF_TARGET)
    },
    [disabled, onPlace]
  )

  const offTargetActive = activeCell === OFF_TARGET

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted-foreground">Where in goal</span>
        <span className="text-muted-foreground">
          {activeCell != null ? GOAL_CELL_LABELS[activeCell] : "numpad, or tap"}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={VIEW_BOX}
        role="img"
        aria-label="Goal mouth as a 3 by 3 grid. Tap a cell, or the border for off target. Numpad keys 1 to 9 match the grid layout; 0 is off target."
        onClick={(event) => handleClick(event.clientX, event.clientY)}
        className={cn(
          "w-full rounded-lg border bg-card",
          disabled ? "pointer-events-none opacity-40" : "cursor-crosshair"
        )}
        style={{ aspectRatio: `${GOAL_W + BAND * 2} / ${GOAL_H + BAND * 2}` }}
      >
        {offTargetActive && (
          <rect
            x={-BAND}
            y={-BAND}
            width={GOAL_W + BAND * 2}
            height={GOAL_H + BAND * 2}
            fill="var(--status-critical)"
            fillOpacity={0.14}
          />
        )}

        {/* Goal mouth. */}
        <rect x={0} y={0} width={GOAL_W} height={GOAL_H} fill="var(--brand-muted)" />

        {/* Cell divisions. */}
        {[1, 2].map((i) => (
          <line
            key={`v${i}`}
            x1={(GOAL_W / 3) * i}
            y1={0}
            x2={(GOAL_W / 3) * i}
            y2={GOAL_H}
            stroke="var(--border)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {[1, 2].map((i) => (
          <line
            key={`h${i}`}
            x1={0}
            y1={(GOAL_H / 3) * i}
            x2={GOAL_W}
            y2={(GOAL_H / 3) * i}
            stroke="var(--border)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {activeCell != null &&
          activeCell !== OFF_TARGET &&
          (() => {
            const position = goalCellPosition(activeCell)
            if (!position) return null
            return (
              <rect
                x={position.column * (GOAL_W / 3)}
                y={position.rowFromTop * (GOAL_H / 3)}
                width={GOAL_W / 3}
                height={GOAL_H / 3}
                fill="var(--brand-accent)"
                fillOpacity={0.22}
              />
            )
          })()}

        {/* Posts and crossbar. */}
        <rect
          x={0}
          y={0}
          width={GOAL_W}
          height={GOAL_H}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={4}
          vectorEffect="non-scaling-stroke"
        />

        {placements.map((placement, index) => {
          const centre = cellCentre(placement.cell)
          if (!centre) return null
          // Fan repeats within a cell so five goals in the top corner read as
          // five marks rather than one. Deterministic, not random, so a redraw
          // does not shuffle them.
          const spread = (index % 5) - 2
          const ring = Math.floor(index / 5) % 3
          return (
            <circle
              key={placement.id}
              cx={centre.cx + spread * 13}
              cy={centre.cy + (ring - 1) * 13}
              r={placement.id === activeId ? 13 : 9}
              fill={fillFor(placement.outcome)}
              fillOpacity={placement.id === activeId ? 1 : 0.6}
              stroke={placement.id === activeId ? "var(--foreground)" : "none"}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

        <text
          x={GOAL_W / 2}
          y={GOAL_H + BAND - 12}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 26 }}
        >
          off target
        </text>
      </svg>
    </div>
  )
}
