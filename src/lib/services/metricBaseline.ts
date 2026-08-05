/**
 * "Normal range", derived rather than declared.
 *
 * The reference design's whole trend list rests on one idea: a number on its
 * own says nothing, so every metric is shown against the band it usually sits
 * in. 60.4 ms of HRV is not high or low until you know this athlete runs at
 * 68 +/- 7.
 *
 * That band is computed here from the athlete's own trailing history rather
 * than from population norms, which is the only version that is honest for a
 * single-user app synced from consumer wearables - a "normal" resting HR for
 * the population is not normal for anyone in particular.
 *
 * Everything downstream reads off this: the verdict line under a value, the
 * shaded band behind a sparkline, and the marker position in a range gauge.
 */

/** Below this many samples the spread is noise, and a band would be a lie. */
const MIN_SAMPLES = 10

/**
 * The trailing window a band is built from. Long enough to average out a hard
 * week, short enough to follow real fitness change rather than anchoring to
 * where the athlete was three months ago.
 */
export const BASELINE_WINDOW_DAYS = 60

export interface Baseline {
  mean: number
  /** Population standard deviation over the window. */
  sd: number
  /** mean - sd. The floor of the shaded band. */
  low: number
  /** mean + sd. The ceiling of the shaded band. */
  high: number
  /** How many real readings the band was built from. */
  samples: number
}

export type Deviation = "below" | "normal" | "above"

/**
 * Which way is good, so a deviation can be coloured.
 *
 * "none" is not a cop-out - weight and training load genuinely have no better
 * direction, and colouring them green or orange would assert something the app
 * does not know.
 */
export type GoodDirection = "up" | "down" | "none"

/**
 * Builds a band from a series, ignoring gaps.
 *
 * Nulls are dropped rather than zero-filled: a day with no HRV reading is a
 * day the ring was not worn, and treating it as 0 ms would drag the mean down
 * and widen the band until nothing ever looked abnormal.
 */
export function computeBaseline(
  values: ReadonlyArray<number | null | undefined>,
  { minSamples = MIN_SAMPLES }: { minSamples?: number } = {}
): Baseline | null {
  const usable = values.filter((v): v is number => v != null && Number.isFinite(v))
  if (usable.length < minSamples) return null

  const mean = usable.reduce((a, b) => a + b, 0) / usable.length
  const variance = usable.reduce((acc, v) => acc + (v - mean) ** 2, 0) / usable.length
  const sd = Math.sqrt(variance)

  return { mean, sd, low: mean - sd, high: mean + sd, samples: usable.length }
}

/**
 * Where a reading sits against its band.
 *
 * A zero-spread baseline (every reading identical, which happens with
 * step-count targets and short windows) would otherwise make every subsequent
 * value "above" or "below" by a hair, so it is treated as normal unless the
 * value genuinely differs.
 */
export function classify(value: number, baseline: Baseline): Deviation {
  if (baseline.sd === 0) {
    if (value > baseline.mean) return "above"
    if (value < baseline.mean) return "below"
    return "normal"
  }
  if (value < baseline.low) return "below"
  if (value > baseline.high) return "above"
  return "normal"
}

/** Verdict wording, matching the reference's register: short, and about range. */
export const DEVIATION_LABEL: Record<Deviation, string> = {
  below: "Below normal",
  normal: "Normal range",
  above: "Above normal",
}

/**
 * How a deviation should be coloured.
 *
 * In range is always good - that is what a band is for. Out of range is only
 * bad if the metric has a better direction; otherwise it is merely notable,
 * which is what "neutral" means here.
 */
export function deviationTone(
  deviation: Deviation,
  goodDirection: GoodDirection
): "good" | "warning" | "critical" | "neutral" {
  if (deviation === "normal") return "good"
  if (goodDirection === "none") return "neutral"
  const favourable = goodDirection === "up" ? deviation === "above" : deviation === "below"
  return favourable ? "good" : "critical"
}

/**
 * Everything a metric row needs to render itself, in one object.
 *
 * Assembled here rather than in each page so that a metric with too little
 * history degrades the same way everywhere: a value with no verdict and no
 * band, instead of a confident-looking band built from four readings.
 */
export interface MetricReading {
  latest: number | null
  baseline: Baseline | null
  deviation: Deviation | null
  tone: "good" | "warning" | "critical" | "neutral"
  label: string | null
}

export function readMetric(
  values: ReadonlyArray<number | null | undefined>,
  goodDirection: GoodDirection = "none"
): MetricReading {
  const usable = values.filter((v): v is number => v != null && Number.isFinite(v))
  const latest = usable.at(-1) ?? null
  const baseline = computeBaseline(values)

  if (latest == null || baseline == null) {
    return { latest, baseline, deviation: null, tone: "neutral", label: null }
  }

  const deviation = classify(latest, baseline)
  return {
    latest,
    baseline,
    deviation,
    tone: deviationTone(deviation, goodDirection),
    label: DEVIATION_LABEL[deviation],
  }
}
