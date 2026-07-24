import { describe, expect, it } from "vitest"
import { computeReadinessScore } from "@/lib/services/readinessScore"

describe("computeReadinessScore", () => {
  it("scores a perfectly good day near 100", () => {
    const score = computeReadinessScore({
      trainingLoad: 0,
      muscleSoreness: 0,
      mentalStress: 0,
      currentInjury: 0,
      currentIllness: 0,
      sleepQuality: 10,
      foodBeverage: 10,
      mood: 10,
      recoveryEnergy: 10,
    })
    expect(score).toBe(100)
  })

  it("scores a rough day near 0", () => {
    const score = computeReadinessScore({
      trainingLoad: 10,
      muscleSoreness: 10,
      mentalStress: 10,
      currentInjury: 10,
      currentIllness: 10,
      sleepQuality: 0,
      foodBeverage: 0,
      mood: 0,
      recoveryEnergy: 0,
    })
    expect(score).toBe(0)
  })

  it("scores an all-5s day at exactly the middle", () => {
    const score = computeReadinessScore({
      trainingLoad: 5,
      muscleSoreness: 5,
      mentalStress: 5,
      currentInjury: 5,
      currentIllness: 5,
      sleepQuality: 5,
      foodBeverage: 5,
      mood: 5,
      recoveryEnergy: 5,
    })
    expect(score).toBe(50)
  })
})
