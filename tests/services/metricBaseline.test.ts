import { describe, expect, it } from "vitest"
import {
  classify,
  computeBaseline,
  deviationTone,
  readMetric,
  type Baseline,
} from "@/lib/services/metricBaseline"

/** Twelve readings, mean 10, so the band arithmetic is checkable by hand. */
const FLAT_TEN = Array.from({ length: 12 }, () => 10)

describe("computeBaseline", () => {
  it("withholds a band below the sample floor", () => {
    // Nine readings is the point of the rule: a band from a handful of days
    // would be a confident-looking claim about spread that the data cannot
    // support, and every consumer renders "no verdict" rather than guessing.
    expect(computeBaseline(Array.from({ length: 9 }, () => 10))).toBeNull()
  })

  it("builds a band once there are enough readings", () => {
    const baseline = computeBaseline(FLAT_TEN)!
    expect(baseline.mean).toBe(10)
    expect(baseline.sd).toBe(0)
    expect(baseline.samples).toBe(12)
  })

  it("drops gaps rather than counting them as zero", () => {
    // The whole reason nulls are preserved upstream. A fortnight without the
    // ring on must not drag the mean toward zero and widen the band until
    // nothing ever reads as abnormal.
    const withGaps = [...FLAT_TEN, null, undefined, null]
    const baseline = computeBaseline(withGaps)!

    expect(baseline.mean).toBe(10)
    expect(baseline.samples).toBe(12)
  })

  it("does not count gaps toward the sample floor", () => {
    const mostlyMissing = [1, 2, 3, null, null, null, null, null, null, null, null, null]
    expect(computeBaseline(mostlyMissing)).toBeNull()
  })

  it("puts low and high one standard deviation either side of the mean", () => {
    // Mean 10, population SD 2.
    const values = [8, 8, 8, 8, 8, 8, 12, 12, 12, 12, 12, 12]
    const baseline = computeBaseline(values)!

    expect(baseline.mean).toBe(10)
    expect(baseline.sd).toBe(2)
    expect(baseline.low).toBe(8)
    expect(baseline.high).toBe(12)
  })
})

describe("classify", () => {
  const baseline: Baseline = { mean: 10, sd: 2, low: 8, high: 12, samples: 30 }

  it("calls readings inside the band normal, inclusive of the edges", () => {
    expect(classify(10, baseline)).toBe("normal")
    expect(classify(8, baseline)).toBe("normal")
    expect(classify(12, baseline)).toBe("normal")
  })

  it("calls readings outside the band by their direction", () => {
    expect(classify(7.9, baseline)).toBe("below")
    expect(classify(12.1, baseline)).toBe("above")
  })

  it("treats a zero-spread baseline as normal unless the value actually differs", () => {
    // A step target that has been identical all month gives sd 0, which would
    // otherwise make every subsequent reading "above" or "below" by a hair.
    const flat: Baseline = { mean: 10, sd: 0, low: 10, high: 10, samples: 30 }

    expect(classify(10, flat)).toBe("normal")
    expect(classify(11, flat)).toBe("above")
    expect(classify(9, flat)).toBe("below")
  })
})

describe("deviationTone", () => {
  it("treats in-range as good whatever the metric", () => {
    expect(deviationTone("normal", "up")).toBe("good")
    expect(deviationTone("normal", "down")).toBe("good")
    expect(deviationTone("normal", "none")).toBe("good")
  })

  it("colours an out-of-range reading by whether it moved the good way", () => {
    // HRV: up is good.
    expect(deviationTone("above", "up")).toBe("good")
    expect(deviationTone("below", "up")).toBe("critical")

    // Resting HR: down is good.
    expect(deviationTone("below", "down")).toBe("good")
    expect(deviationTone("above", "down")).toBe("critical")
  })

  it("stays neutral for metrics with no better direction", () => {
    // Weight and training load. Colouring these would assert something the app
    // does not know.
    expect(deviationTone("above", "none")).toBe("neutral")
    expect(deviationTone("below", "none")).toBe("neutral")
  })
})

describe("readMetric", () => {
  it("reports the last real reading, not the last slot", () => {
    // Weight is weighed weekly; the trailing nulls are the six days since.
    const reading = readMetric([...FLAT_TEN, 14, null, null, null], "none")
    expect(reading.latest).toBe(14)
  })

  it("returns a value with no verdict when there is too little history", () => {
    const reading = readMetric([5, 6, 7], "up")

    expect(reading.latest).toBe(7)
    expect(reading.baseline).toBeNull()
    expect(reading.deviation).toBeNull()
    expect(reading.label).toBeNull()
  })

  it("returns nothing at all for an empty series", () => {
    const reading = readMetric([null, undefined], "up")

    expect(reading.latest).toBeNull()
    expect(reading.deviation).toBeNull()
  })

  it("labels and tones a reading that has fallen out of range", () => {
    // Eleven nights around 8h, then a 5h night.
    const sleep = [8, 8.2, 7.8, 8.1, 7.9, 8, 8.3, 7.7, 8, 8.1, 7.9, 5]
    const reading = readMetric(sleep, "up")

    expect(reading.latest).toBe(5)
    expect(reading.deviation).toBe("below")
    expect(reading.label).toBe("Below normal")
    expect(reading.tone).toBe("critical")
  })
})
