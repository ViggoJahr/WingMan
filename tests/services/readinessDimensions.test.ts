import { describe, expect, it } from "vitest"
import { READINESS_DIMENSIONS, describeValue } from "@/lib/services/readinessDimensions"

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
