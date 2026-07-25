// Readiness questionnaire content, inspired by SVEXA's Readiness Advisor.
// Shared between the slider UI (live hover/position description) and the
// scoring logic (direction: which way "better" points).

export type ReadinessField =
  | "training_load"
  | "muscle_soreness"
  | "mental_stress"
  | "current_injury"
  | "current_illness"
  | "sleep_quality"
  | "food_beverage"
  | "mood"
  | "recovery_energy"

export interface ScoreBracket {
  min: number
  max: number
  description: string
}

export interface ReadinessDimension {
  field: ReadinessField
  label: string
  // "good": higher value = better readiness. "bad": higher value = worse.
  direction: "good" | "bad"
  brackets: ScoreBracket[]
}

export const READINESS_DIMENSIONS: ReadinessDimension[] = [
  {
    field: "training_load",
    label: "Training load yesterday",
    direction: "bad",
    brackets: [
      { min: 0, max: 0, description: "No activity at all." },
      { min: 1, max: 2, description: "Easy training, physical activity." },
      { min: 3, max: 4, description: "Training to maintain level, no improvements expected." },
      { min: 5, max: 6, description: "Normal hard (heavy) training, full training session." },
      { min: 7, max: 8, description: "Harder than normal, e.g. longer or harder sessions." },
      { min: 9, max: 10, description: "Maximal training load, conscious overtraining." },
    ],
  },
  {
    field: "muscle_soreness",
    label: "Muscle soreness and fatigue",
    direction: "bad",
    brackets: [
      { min: 0, max: 0, description: "Muscles feel perfectly fine, feels bouncy and explosive." },
      { min: 1, max: 2, description: "No fatigue/pain. Normal muscles." },
      { min: 3, max: 4, description: "Slight muscle fatigue/pain." },
      { min: 5, max: 6, description: "Moderate muscle fatigue/pain." },
      { min: 7, max: 8, description: "Pronounced muscle fatigue/pain." },
      { min: 9, max: 10, description: "Extreme muscle fatigue/pain." },
    ],
  },
  {
    field: "mental_stress",
    label: "Mental stress",
    direction: "bad",
    brackets: [
      { min: 0, max: 0, description: "No stress or effort at all." },
      {
        min: 1,
        max: 2,
        description: "Very little conscious mental effort. Almost everything known and automatic.",
      },
      {
        min: 3,
        max: 4,
        description: "Some mental effort and stress. Complex but familiar activities and situations.",
      },
      {
        min: 5,
        max: 6,
        description:
          "High mental effort. Moderate complexity due to some uncertainty, unpredictability or unfamiliarity.",
      },
      {
        min: 7,
        max: 8,
        description:
          "More than normal, extensive stress, mental effort, and concentration. New, unknown and/or complex activity requiring full attention.",
      },
      { min: 9, max: 10, description: "Maximal stress and effort. Completely exhausted." },
    ],
  },
  {
    field: "current_injury",
    label: "Current injury",
    direction: "bad",
    brackets: [
      { min: 0, max: 0, description: "Nothing is affecting me, completely healthy." },
      { min: 1, max: 2, description: "Very minor issues, do not affect training." },
      { min: 3, max: 4, description: "A small injury that needs care but does not hinder training." },
      { min: 5, max: 6, description: "Injury that requires adjustment in training." },
      {
        min: 7,
        max: 8,
        description: "Painful injury that affects movement patterns. Normal training is impossible.",
      },
      {
        min: 9,
        max: 10,
        description:
          "Painful/serious injury that requires painkillers or affects daily life. No training except early rehab is possible.",
      },
    ],
  },
  {
    field: "current_illness",
    label: "Current illness",
    direction: "bad",
    brackets: [
      { min: 0, max: 0, description: "Nothing affecting me, completely healthy." },
      { min: 1, max: 2, description: "Very minor issues, do not affect training." },
      { min: 3, max: 4, description: "A runny nose, itchy throat or headache that does not hinder training." },
      { min: 5, max: 6, description: "A common cold or sore throat that requires adjustment in training." },
      { min: 7, max: 8, description: "A fever or other infection that stops you from training." },
      { min: 9, max: 10, description: "High fever or serious infection/influenza." },
    ],
  },
  {
    field: "sleep_quality",
    label: "Sleep last night",
    direction: "good",
    brackets: [
      { min: 0, max: 0, description: "Extremely poor, <1 hour." },
      { min: 1, max: 2, description: "Very poor sleep, just a few hours." },
      { min: 3, max: 4, description: "Poor anxious sleep, too short sleep." },
      { min: 5, max: 6, description: "Insufficient sleep, tired when rising." },
      { min: 7, max: 8, description: "Good sleep, 7-8 hours normal sleep." },
      { min: 9, max: 10, description: "Very good sleep, 9+ hours, woke up without an alarm." },
    ],
  },
  {
    field: "food_beverage",
    label: "Food and beverage intake yesterday",
    direction: "good",
    brackets: [
      { min: 0, max: 0, description: "No food at all." },
      { min: 1, max: 2, description: "Major issue, that should disqualify from hard training." },
      {
        min: 3,
        max: 4,
        description: "Large flaws, e.g. only 1 proper meal during travel day. Fluid status: dark yellow urine.",
      },
      { min: 5, max: 6, description: "Medium flaws, e.g. missed meals or mainly junk food." },
      { min: 7, max: 8, description: "Minor flaws, e.g. suboptimal timing, nutrients or not enough fluids." },
      {
        min: 9,
        max: 10,
        description: "Perfect food and fluid intake. Fluid status: light yellow urine.",
      },
    ],
  },
  {
    field: "mood",
    label: "Mood last 24 hours",
    direction: "good",
    brackets: [
      { min: 0, max: 0, description: "Angry, worn out, depressed or lethargic." },
      { min: 1, max: 2, description: "Not good at all, irritated, anxiety and/or depression symptoms." },
      { min: 3, max: 4, description: "Not good, irritated, angry, doesn't feel balanced." },
      { min: 5, max: 6, description: "Somewhat stressed, easily irritated and annoyed." },
      { min: 7, max: 8, description: 'Fine, happy, can easily handle stressors, "in balance."' },
      {
        min: 9,
        max: 10,
        description:
          "Very good, very happy, clearheaded. Completely calm, relaxed, powerful, stable and in harmony.",
      },
    ],
  },
  {
    field: "recovery_energy",
    label: "Recovery and energy level today",
    direction: "good",
    brackets: [
      { min: 0, max: 0, description: "Terrible, no energy, requires several days rest." },
      { min: 1, max: 2, description: "Not at all recovered, need a rest day and an energy boost." },
      { min: 3, max: 4, description: "Not well recovered, minimal energy, only able to do light training." },
      { min: 5, max: 6, description: "Moderately recovered, lacking a bit of energy, hard to find energy to train." },
      { min: 7, max: 8, description: "Well recovered, energy to train as usual." },
      { min: 9, max: 10, description: "Perfectly ready to go, fully recovered, full of energy." },
    ],
  },
]

export function describeValue(dimension: ReadinessDimension, value: number): string {
  const bracket = dimension.brackets.find((b) => value >= b.min && value <= b.max)
  return bracket?.description ?? ""
}

// Thresholds match the questionnaire's own wording - "requires adjustment
// in training" starts at the 5-6 bracket for both injury and illness.
export const WARNING_THRESHOLD = 5
