import { describe, expect, it } from "vitest"
import {
  COURT,
  COURT_ZONES,
  GOAL_CELLS,
  GOAL_CELL_LABELS,
  OFF_TARGET,
  clampCourtX,
  clampCourtY,
  coordsToZone,
  goalCellFromFraction,
  goalCellFromKeyCode,
  goalCellPosition,
  zoneToShotOrigin,
  type CourtZone,
} from "@/lib/handball/zones"
import { SHOT_ORIGINS } from "@/lib/handball/events"

describe("coordsToZone", () => {
  it("reads the penalty spot as a 7m", () => {
    expect(coordsToZone(0, COURT.PENALTY_Y)).toBe("seven_metre")
  })

  it("does not call a near-miss of the spot a 7m", () => {
    // A central shot from 7m out is an ordinary breakthrough-depth shot. Only a
    // deliberate tap on the mark should claim a penalty.
    expect(coordsToZone(1.5, COURT.PENALTY_Y)).not.toBe("seven_metre")
    expect(coordsToZone(0, 8.5)).not.toBe("seven_metre")
  })

  it("separates the wings by sign, so left and right never merge", () => {
    expect(coordsToZone(-8.5, 2)).toBe("left_wing")
    expect(coordsToZone(8.5, 2)).toBe("right_wing")
  })

  it("calls a wide shot at 6m a wing, not a pivot", () => {
    // Angle defines a wing shot, not distance - this is the ordering the
    // implementation depends on.
    expect(coordsToZone(-7, 6)).toBe("left_wing")
    expect(coordsToZone(0, 6)).toBe("pivot")
  })

  it("puts a shot on the goal-area line in front of goal at pivot", () => {
    expect(coordsToZone(0, 6)).toBe("pivot")
    expect(coordsToZone(-2, 5)).toBe("pivot")
  })

  it("treats the space between the lines as a breakthrough", () => {
    expect(coordsToZone(0, 8)).toBe("breakthrough_depth")
    expect(coordsToZone(-3, 7.5)).toBe("breakthrough_depth")
  })

  it("splits the backcourt into left, centre and right", () => {
    expect(coordsToZone(-5, 10)).toBe("left_back")
    expect(coordsToZone(0, 10)).toBe("centre_back")
    expect(coordsToZone(5, 10)).toBe("right_back")
  })

  it("calls anything beyond 12m long range regardless of width", () => {
    expect(coordsToZone(0, 15)).toBe("long_range")
    expect(coordsToZone(-9, 15)).toBe("long_range")
  })

  it("is mirror-symmetric about the centre line", () => {
    const mirrored: Partial<Record<CourtZone, CourtZone>> = {
      left_wing: "right_wing",
      right_wing: "left_wing",
      left_back: "right_back",
      right_back: "left_back",
    }
    for (let x = 0.5; x <= 10; x += 0.5) {
      for (let y = 0.5; y <= 20; y += 0.5) {
        const left = coordsToZone(-x, y)
        const right = coordsToZone(x, y)
        expect(right).toBe(mirrored[left] ?? left)
      }
    }
  })

  it("returns a known zone for every point on the half court", () => {
    for (let x = -10; x <= 10; x += 0.5) {
      for (let y = 0; y <= 20; y += 0.5) {
        expect(COURT_ZONES).toContain(coordsToZone(x, y))
      }
    }
  })

  it("clamps out-of-bounds taps rather than inventing a zone", () => {
    expect(clampCourtX(-99)).toBe(-COURT.HALF_WIDTH)
    expect(clampCourtX(99)).toBe(COURT.HALF_WIDTH)
    expect(clampCourtY(-5)).toBe(0)
    expect(clampCourtY(99)).toBe(COURT.LENGTH)
    expect(COURT_ZONES).toContain(coordsToZone(-99, -99))
  })
})

describe("zoneToShotOrigin", () => {
  it("only ever produces origins the event taxonomy already knows", () => {
    for (const zone of COURT_ZONES) {
      const origin = zoneToShotOrigin(zone)
      if (origin !== null) expect(SHOT_ORIGINS).toContain(origin)
    }
  })

  it("maps every zone, so a tap always suggests something", () => {
    for (const zone of COURT_ZONES) {
      expect(zoneToShotOrigin(zone)).not.toBeNull()
    }
  })

  it("collapses both wings onto the single wing origin", () => {
    expect(zoneToShotOrigin("left_wing")).toBe("wing")
    expect(zoneToShotOrigin("right_wing")).toBe("wing")
  })

  it("counts every backcourt zone, including long range, as a 9m attempt", () => {
    expect(zoneToShotOrigin("left_back")).toBe("nine_m")
    expect(zoneToShotOrigin("centre_back")).toBe("nine_m")
    expect(zoneToShotOrigin("right_back")).toBe("nine_m")
    expect(zoneToShotOrigin("long_range")).toBe("nine_m")
  })

  it("never derives fastbreak, which position cannot tell you", () => {
    // A fastbreak is finished from anywhere; if geometry claimed it, tapping the
    // court would overwrite the one origin the user has to supply by hand.
    const derived = COURT_ZONES.map(zoneToShotOrigin)
    expect(derived).not.toContain("fastbreak")
  })
})

describe("goal grid", () => {
  it("numbers cells like a numpad, bottom row first", () => {
    expect(goalCellFromFraction(0.1, 0.1)).toBe(7) // top left
    expect(goalCellFromFraction(0.5, 0.1)).toBe(8)
    expect(goalCellFromFraction(0.9, 0.1)).toBe(9) // top right
    expect(goalCellFromFraction(0.5, 0.5)).toBe(5) // centre
    expect(goalCellFromFraction(0.1, 0.9)).toBe(1) // bottom left
    expect(goalCellFromFraction(0.9, 0.9)).toBe(3) // bottom right
  })

  it("covers all nine cells exactly once across the goal mouth", () => {
    const seen = new Set<number>()
    for (const fx of [0.1, 0.5, 0.9]) {
      for (const fy of [0.1, 0.5, 0.9]) seen.add(goalCellFromFraction(fx, fy))
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it("clamps a click on the frame instead of producing cell 0 or 10", () => {
    expect(goalCellFromFraction(0, 0)).toBe(7)
    expect(goalCellFromFraction(1, 1)).toBe(3)
    expect(goalCellFromFraction(-0.2, 1.4)).toBe(1)
  })

  it("round-trips a cell through its grid position", () => {
    for (const cell of GOAL_CELLS) {
      const position = goalCellPosition(cell)
      expect(position).not.toBeNull()
      const fx = (position!.column + 0.5) / 3
      const fy = (position!.rowFromTop + 0.5) / 3
      expect(goalCellFromFraction(fx, fy)).toBe(cell)
    }
  })

  it("rejects values outside the grid, including off-target", () => {
    expect(goalCellPosition(OFF_TARGET)).toBeNull()
    expect(goalCellPosition(10)).toBeNull()
    expect(goalCellPosition(4.5)).toBeNull()
  })

  it("labels every cell plus off-target", () => {
    for (const cell of GOAL_CELLS) expect(GOAL_CELL_LABELS[cell]).toBeTruthy()
    expect(GOAL_CELL_LABELS[OFF_TARGET]).toBe("Off target")
  })
})

describe("goalCellFromKeyCode", () => {
  it("maps the numpad onto cells, with 0 as off target", () => {
    expect(goalCellFromKeyCode("Numpad9")).toBe(9)
    expect(goalCellFromKeyCode("Numpad5")).toBe(5)
    expect(goalCellFromKeyCode("Numpad0")).toBe(OFF_TARGET)
  })

  it("ignores the top-row digits, which already set shot origin", () => {
    // This is the whole reason the handler reads `code` rather than `key`:
    // Digit1-7 are taken, and the two must not collide.
    expect(goalCellFromKeyCode("Digit5")).toBeNull()
    expect(goalCellFromKeyCode("KeyG")).toBeNull()
    expect(goalCellFromKeyCode("5")).toBeNull()
  })
})
