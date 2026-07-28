// Borg 6-20 descriptors, collapsed to the handful of steps worth distinguishing
// after the fact. Asking "how hard was that, roughly" days later is only ever
// going to be approximate, so offering all 20 values would be false precision.
//
// Extracted from RpeQuickSet so the log forms and the session-detail quick-set
// offer the same six anchors - previously the forms used a bare 1-20 number
// input and the two surfaces disagreed about what an RPE even looks like.

export interface RpeChoice {
  value: number
  label: string
  hint: string
}

export const RPE_CHOICES: RpeChoice[] = [
  { value: 8, label: "Very easy", hint: "recovery, barely noticed it" },
  { value: 11, label: "Easy", hint: "comfortable, could talk freely" },
  { value: 13, label: "Moderate", hint: "working, but sustainable" },
  { value: 15, label: "Hard", hint: "breathing heavily, talking is an effort" },
  { value: 17, label: "Very hard", hint: "near maximal, couldn't hold it long" },
  { value: 19, label: "Maximal", hint: "everything I had" },
]
