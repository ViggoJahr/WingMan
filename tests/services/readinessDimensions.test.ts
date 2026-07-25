import { describe, expect, it } from "vitest"
import { READINESS_DIMENSIONS, describeValue, severityFor } from "@/lib/services/readinessDimensions"

describe("readinessDimensions", () => {
  it("has all 9 fields with 6 brackets each covering 0-10", () => {
    expect(READINESS_DIMENSIONS).toHaveLength(9)
    for (const dim of READINESS_DIMENSIONS) {
      expect(dim.brackets).toHaveLength(6)
      expect(dim.brackets[0].min).toBe(0)
      expect(dim.brackets.at(-1)!.max).toBe(10)
    }
  })

  it("describeValue finds the right bracket at boundaries", () => {
    const trainingLoad = READINESS_DIMENSIONS.find((d) => d.field === "training_load")!
    expect(describeValue(trainingLoad, 0)).toBe("No activity at all.")
    expect(describeValue(trainingLoad, 4)).toBe("Training to maintain level, no improvements expected.")
    expect(describeValue(trainingLoad, 10)).toBe("Maximal training load, conscious overtraining.")
  })
})

describe("severityFor", () => {
  const badField = READINESS_DIMENSIONS.find((d) => d.field === "current_injury")!
  const goodField = READINESS_DIMENSIONS.find((d) => d.field === "sleep_quality")!

  it("for a bad-direction field, low is good and high is critical", () => {
    expect(severityFor(badField, 0)).toBe("good")
    expect(severityFor(badField, 2)).toBe("good")
    expect(severityFor(badField, 3)).toBe("warning")
    expect(severityFor(badField, 6)).toBe("warning")
    expect(severityFor(badField, 7)).toBe("critical")
    expect(severityFor(badField, 10)).toBe("critical")
  })

  it("for a good-direction field, the mapping is mirrored", () => {
    expect(severityFor(goodField, 0)).toBe("critical")
    expect(severityFor(goodField, 2)).toBe("critical")
    expect(severityFor(goodField, 4)).toBe("warning")
    expect(severityFor(goodField, 8)).toBe("good")
    expect(severityFor(goodField, 10)).toBe("good")
  })
})
