export interface ReadinessInputs {
  trainingLoad: number
  muscleSoreness: number
  mentalStress: number
  currentInjury: number
  currentIllness: number
  sleepQuality: number
  foodBeverage: number
  mood: number
  recoveryEnergy: number
}

// Averages the "good direction" inputs (higher is better) against the
// inverse of the "bad direction" inputs (higher is worse), then scales the
// 0-10 result to 0-100. Direction per field matches readinessDimensions.ts.
export function computeReadinessScore(inputs: ReadinessInputs): number {
  const positive =
    (inputs.sleepQuality + inputs.foodBeverage + inputs.mood + inputs.recoveryEnergy) / 4

  const negative =
    (inputs.trainingLoad +
      inputs.muscleSoreness +
      inputs.mentalStress +
      inputs.currentInjury +
      inputs.currentIllness) /
    5

  const score = ((positive + (10 - negative)) / 2) * 10
  return Math.round(Math.min(100, Math.max(0, score)))
}

// Blends today's raw score with the most recent prior check-in so one bad
// (or great) day doesn't swing the number wildly - a weighted moving
// average, same idea as the Readiness Advisor's damping. 0.65 means today
// counts for 65%, yesterday's stored score carries the remaining 35%;
// raise it for more responsiveness, lower it for more damping.
const SMOOTHING_WEIGHT = 0.65

export function smoothReadinessScore(rawScore: number, previousScore: number | null): number {
  if (previousScore == null) return rawScore
  const blended = rawScore * SMOOTHING_WEIGHT + previousScore * (1 - SMOOTHING_WEIGHT)
  return Math.round(Math.min(100, Math.max(0, blended)))
}
