import { describe, expect, it } from "vitest"
import {
  HANDBALL_POSITIONS,
  LOAD_BANDS,
  POSITION_LABELS,
  THROW_BANDS,
  loadBandLabel,
  throwBandLabel,
} from "@/lib/handball/vocab"

describe("throwBandLabel", () => {
  it("renders each stored midpoint back to the band it came from", () => {
    expect(throwBandLabel(0)).toBe("None")
    expect(throwBandLabel(15)).toBe("Few")
    expect(throwBandLabel(55)).toBe("Normal")
    expect(throwBandLabel(110)).toBe("Lots")
  })

  it("returns null for an unlogged session rather than a misleading zero", () => {
    // 0 is a real answer ("didn't throw"); null means nobody said.
    expect(throwBandLabel(null)).toBeNull()
    expect(throwBandLabel(0)).toBe("None")
  })

  it("falls back to a raw count for hand-edited values off the band grid", () => {
    expect(throwBandLabel(42)).toBe("42 throws")
  })
})

describe("loadBandLabel", () => {
  it("maps the 0-3 band to its label", () => {
    expect(loadBandLabel(0)).toBe("None")
    expect(loadBandLabel(1)).toBe("Some")
    expect(loadBandLabel(2)).toBe("Lots")
    expect(loadBandLabel(3)).toBe("Max")
  })

  it("returns null for unlogged and for values outside the CHECK range", () => {
    expect(loadBandLabel(null)).toBeNull()
    expect(loadBandLabel(4)).toBeNull()
  })
})

describe("vocabulary integrity", () => {
  it("labels every position, so the detail view never falls back to a raw slug", () => {
    for (const position of HANDBALL_POSITIONS) {
      expect(POSITION_LABELS[position]).toBeTruthy()
    }
    expect(Object.keys(POSITION_LABELS)).toHaveLength(HANDBALL_POSITIONS.length)
  })

  it("keeps throw midpoints ascending and distinct so the band is recoverable", () => {
    const values = THROW_BANDS.map((band) => band.value)
    expect(new Set(values).size).toBe(values.length)
    expect([...values].sort((a, b) => a - b)).toEqual(values)
  })

  it("keeps load bands within the 0-3 CHECK constraint on handball_sessions", () => {
    const values = LOAD_BANDS.map((band) => band.value)
    expect(values).toEqual([0, 1, 2, 3])
  })
})
