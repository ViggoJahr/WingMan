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

// First-pass scoring model: averages the "good direction" inputs (higher is
// better) against the inverse of the "bad direction" inputs (higher is
// worse), then scales the 0-10 result to 0-100. Adjust the weighting here if
// it doesn't match how you actually want readiness reflected.
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
