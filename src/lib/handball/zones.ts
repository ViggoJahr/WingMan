// Court and goal geometry for the shot map.
//
// Pure and dependency-free, like events.ts and vocab.ts, so the Zod schemas,
// the SVG inputs and any later analysis all read the same numbers - and so the
// thresholds are unit-testable rather than buried in a component.
//
// ---------------------------------------------------------------------------
// Coordinate system
// ---------------------------------------------------------------------------
//
// You only ever attack one goal, so a full 40x20 court would waste half the
// range and put the interesting detail in a corner. These are metres on the
// ATTACKING HALF, with the origin at the CENTRE OF THE GOAL LINE:
//
//                        court_y
//                           ^
//        -10 ......... 0 ......... +10   court_x
//          |                        |
//     y=9  | - - - - - - - - - - -  |    free-throw line (dashed)
//     y=7  |           .            |    penalty spot
//     y=6  |  ______________        |    goal-area line
//     y=0  +-------[GOAL]-----------+    goal line
//
//   court_x   -10.00 .. +10.00   negative = left as the SHOOTER faces the goal
//   court_y     0.00 .. 20.00    distance out from the goal line
//
// Centre-origin rather than corner-origin because it makes symmetry free:
// abs(x) is immediately "how wide", and the sign carries left/right directly -
// which is the comparison actually worth making, since a right-handed player is
// a different shooter from the left wing than the right. numeric(5,2) on
// match_events holds this range with room to spare.

export const COURT = {
  /** Half the court width. x runs -10 .. +10. */
  HALF_WIDTH: 10,
  /** How far out the map extends. Nothing useful is shot from beyond this. */
  LENGTH: 20,
  /** Goal is 3m wide, so the posts sit at x = +/-1.5. */
  GOAL_HALF_WIDTH: 1.5,
  /** Goal is 2m high. Used for the goal grid's aspect ratio. */
  GOAL_HEIGHT: 2,
  /** Goal-area ("6-metre") line: arcs of this radius centred on each post. */
  GOAL_AREA_RADIUS: 6,
  /** Free-throw ("9-metre") dashed line, same construction. */
  FREE_THROW_RADIUS: 9,
  /** The penalty mark, at (0, 7). */
  PENALTY_Y: 7,
} as const

// Zone thresholds. Named because the exact values are a judgement call about
// handball, not geometry, and the tests below them are the argument.
const SEVEN_METRE_TOLERANCE = 0.6 // you have to actually mean the penalty spot
const WING_MIN_ABS_X = 5.0 // wide enough that the shooting angle collapses
const WING_MAX_Y = 8.0 // beyond this you are a back playing wide, not a wing
const PIVOT_MAX_Y = 6.5 // at or just outside the goal-area line
const BREAKTHROUGH_MAX_Y = 9.0 // between the lines = you beat someone
const LONG_RANGE_MIN_Y = 12.0
const BACK_CENTRE_ABS_X = 2.5 // splits the three backcourt positions

export const COURT_ZONES = [
  "left_wing",
  "right_wing",
  "pivot",
  "breakthrough_depth",
  "left_back",
  "centre_back",
  "right_back",
  "long_range",
  "seven_metre",
] as const

export type CourtZone = (typeof COURT_ZONES)[number]

export const COURT_ZONE_LABELS: Record<CourtZone, string> = {
  left_wing: "Left wing",
  right_wing: "Right wing",
  pivot: "Pivot",
  breakthrough_depth: "Breakthrough",
  left_back: "Left back",
  centre_back: "Centre back",
  right_back: "Right back",
  long_range: "Long range",
  seven_metre: "7m",
}

export function clampCourtX(x: number): number {
  return Math.min(COURT.HALF_WIDTH, Math.max(-COURT.HALF_WIDTH, x))
}

export function clampCourtY(y: number): number {
  return Math.min(COURT.LENGTH, Math.max(0, y))
}

/**
 * Which zone a point falls in. Order matters: the penalty spot wins over
 * everything, then distance, then width.
 */
export function coordsToZone(x: number, y: number): CourtZone {
  const cx = clampCourtX(x)
  const cy = clampCourtY(y)

  if (Math.hypot(cx, cy - COURT.PENALTY_Y) <= SEVEN_METRE_TOLERANCE) return "seven_metre"
  if (cy > LONG_RANGE_MIN_Y) return "long_range"

  // Checked before depth: a shot from 6m out by the sideline is a wing shot,
  // not a pivot shot, because the angle is what defines it.
  if (Math.abs(cx) >= WING_MIN_ABS_X && cy <= WING_MAX_Y) {
    return cx < 0 ? "left_wing" : "right_wing"
  }

  if (cy <= PIVOT_MAX_Y) return "pivot"
  if (cy <= BREAKTHROUGH_MAX_Y) return "breakthrough_depth"

  if (cx <= -BACK_CENTRE_ABS_X) return "left_back"
  if (cx >= BACK_CENTRE_ABS_X) return "right_back"
  return "centre_back"
}

/**
 * The shot_origin a court tap implies, or null where position cannot say.
 *
 * The existing SHOT_ORIGINS enum mixes two dimensions. `wing`, `pivot`,
 * `nine_m` and `seven_metre` are POSITIONAL and genuinely derivable from a tap.
 * `fastbreak` is SITUATIONAL - a fastbreak can be finished from anywhere on the
 * court - so no coordinate implies it. That asymmetry is why the caller must
 * only fill an EMPTY shot_origin from this and never overwrite one the user
 * set: a blind overwrite would silently destroy the half of the vocabulary
 * that geometry cannot recover.
 */
export function zoneToShotOrigin(zone: CourtZone): string | null {
  switch (zone) {
    case "left_wing":
    case "right_wing":
      return "wing"
    case "pivot":
      return "pivot"
    case "breakthrough_depth":
      return "breakthrough"
    case "seven_metre":
      return "seven_metre"
    // A long shot is still a backcourt attempt as far as the box score's
    // nine_m_shots counter is concerned.
    case "left_back":
    case "centre_back":
    case "right_back":
    case "long_range":
      return "nine_m"
  }
}

// ---------------------------------------------------------------------------
// Goal placement
// ---------------------------------------------------------------------------
//
// A 3x3 grid over a 3m x 2m goal gives ~1m x 0.67m cells - the granularity a
// shooter or keeper actually thinks in ("far top corner"), and less sparse than
// court zones so patterns emerge sooner.
//
// Cells are numbered to match a NUMPAD, not reading order:
//
//        7 | 8 | 9      <- crossbar
//        --+---+--
//        4 | 5 | 6
//        --+---+--
//        1 | 2 | 3      <- ground
//
// so Numpad9 is both physically the top-right key and the top-right corner.
// This is a keyboard-driven review tool used by one person, and that physical
// correspondence beats the convention of numbering left-to-right from the top.
//
// 0 means OFF TARGET - over or wide. Without it, "missed the frame" and "not
// tagged yet" would both be NULL and no analysis could separate them.

export const OFF_TARGET = 0

export const GOAL_CELLS = [7, 8, 9, 4, 5, 6, 1, 2, 3] as const

export const GOAL_CELL_LABELS: Record<number, string> = {
  [OFF_TARGET]: "Off target",
  7: "Top left",
  8: "Top centre",
  9: "Top right",
  4: "Mid left",
  5: "Centre",
  6: "Mid right",
  1: "Bottom left",
  2: "Bottom centre",
  3: "Bottom right",
}

function clamp01Index(fraction: number): 0 | 1 | 2 {
  const index = Math.floor(fraction * 3)
  return (index < 0 ? 0 : index > 2 ? 2 : index) as 0 | 1 | 2
}

/**
 * Maps a click inside the goal to a cell.
 *
 * `fx` / `fy` are fractions of the goal's width and height, in SVG convention:
 * fx 0 = left post, fy 0 = crossbar. Returns 1-9.
 */
export function goalCellFromFraction(fx: number, fy: number): number {
  const column = clamp01Index(fx)
  const rowFromTop = clamp01Index(fy)
  // Numbering runs bottom-up, so invert the row before indexing.
  const rowFromBottom = 2 - rowFromTop
  return rowFromBottom * 3 + column + 1
}

/** The inverse, for drawing a stored cell back onto the grid. */
export function goalCellPosition(cell: number): { column: 0 | 1 | 2; rowFromTop: 0 | 1 | 2 } | null {
  if (!Number.isInteger(cell) || cell < 1 || cell > 9) return null
  const zeroBased = cell - 1
  const rowFromBottom = Math.floor(zeroBased / 3)
  return {
    column: (zeroBased % 3) as 0 | 1 | 2,
    rowFromTop: (2 - rowFromBottom) as 0 | 1 | 2,
  }
}

/** `Numpad4` -> 4, `Numpad0` -> 0 (off target). Anything else -> null. */
export function goalCellFromKeyCode(code: string): number | null {
  const match = /^Numpad([0-9])$/.exec(code)
  if (!match) return null
  return Number(match[1])
}
