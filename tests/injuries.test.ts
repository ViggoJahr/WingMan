import { describe, expect, it } from "vitest"
import {
  INJURY_GRADES,
  INJURY_GRADE_LABELS,
  INJURY_GRADE_SHORT,
  INJURY_GRADE_TONE,
  INJURY_SITES,
  INJURY_SITE_LABELS,
  injuryDurationDays,
  injuryGradeLabel,
  injurySiteLabel,
} from "@/lib/injuries"

describe("injuryDurationDays", () => {
  const now = new Date("2026-08-01T16:30:00")

  it("counts a same-day injury as one day, not zero", () => {
    expect(injuryDurationDays("2026-08-01", "2026-08-01", now)).toBe(1)
  })

  it("ignores the part-day while an injury is still open", () => {
    // Rounding here made something logged this morning read as two days.
    expect(injuryDurationDays("2026-08-01", null, now)).toBe(1)
  })

  it("counts both endpoints of a closed injury", () => {
    expect(injuryDurationDays("2026-08-01", "2026-08-03", now)).toBe(3)
    expect(injuryDurationDays("2026-07-01", "2026-07-31", now)).toBe(31)
  })

  it("counts an open injury up to today", () => {
    expect(injuryDurationDays("2026-07-30", null, now)).toBe(3)
  })

  it("never returns less than a day, even on bad input", () => {
    expect(injuryDurationDays("2026-08-05", "2026-08-01", now)).toBe(1)
  })
})

describe("injury vocabulary", () => {
  it("labels every site and grade", () => {
    for (const site of INJURY_SITES) expect(INJURY_SITE_LABELS[site]).toBeTruthy()
    for (const grade of INJURY_GRADES) {
      expect(INJURY_GRADE_LABELS[grade]).toBeTruthy()
      expect(INJURY_GRADE_SHORT[grade]).toBeTruthy()
      expect(INJURY_GRADE_TONE[grade]).toBeTruthy()
    }
  })

  it("falls back to the raw value rather than blanking", () => {
    // `type` and `grade` are unconstrained varchar, so a value predating this
    // vocabulary has to still render.
    expect(injurySiteLabel("elbow")).toBe("Elbow")
    expect(injurySiteLabel("something_old")).toBe("something_old")
    expect(injuryGradeLabel("legacy_grade_2")).toBe("legacy_grade_2")
  })

  it("says Unspecified for a missing site and nothing for a missing grade", () => {
    expect(injurySiteLabel(null)).toBe("Unspecified")
    expect(injuryGradeLabel(null)).toBeNull()
  })
})
