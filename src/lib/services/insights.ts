/**
 * The one card on the home screen that says something rather than reporting
 * something.
 *
 * The reference leads with a narrated paragraph, and copying that shape without
 * copying its substance would be the worst version of this change - a permanent
 * slot that has to be filled every day, which is how you end up generating "you
 * slept 7h 12m" and calling it an insight.
 *
 * So every rule here needs two facts to disagree before it fires. A low
 * readiness score on its own is already on the screen in the ring above; what
 * is *not* on the screen is that it is low while acute load is climbing, and
 * that is the only kind of thing worth a paragraph.
 *
 * Rules are ordered by how much they should interrupt, and `buildInsights`
 * returns at most `limit` of them. Pure and React-free, so it is unit-testable
 * and the icons stay the caller's problem.
 */

import { ACWR_BAND_LABEL, acwrBand } from "./loadMetrics"
import type { Deviation } from "./metricBaseline"

export type InsightKey =
  | "load-spike-low-readiness"
  | "load-spike"
  | "no-rest-days"
  | "sleep-debt"
  | "detraining"
  | "recovered-and-light"

export type InsightTone = "good" | "warning" | "critical" | "brand"

export interface Insight {
  key: InsightKey
  tone: InsightTone
  headline: string
  body: string
  href?: string
  hrefLabel?: string
}

export interface InsightInput {
  /** Latest ACWR, or null when coverage was too thin to trust it. */
  acwr: number | null
  /** Total load over the last 7 days. */
  weeklyLoad: number
  /** Days in the last 7 with no session at all. */
  restDays: number
  readiness: { value: number | null; deviation: Deviation | null }
  sleep: { value: number | null; deviation: Deviation | null }
  /** Consecutive most-recent nights below the athlete's normal range. */
  shortNightStreak: number
}

function hours(value: number): string {
  const whole = Math.floor(value)
  const minutes = Math.round((value - whole) * 60)
  return minutes === 0 ? `${whole}h` : `${whole}h ${minutes}m`
}

/**
 * How many nights below normal before it is a pattern rather than a bad night.
 * Three is the point at which the sleep-debt literature stops treating it as
 * noise, and also the point at which saying so is not nagging.
 */
const SHORT_NIGHT_STREAK = 3

export function buildInsights(input: InsightInput, { limit = 1 }: { limit?: number } = {}): Insight[] {
  const { acwr, weeklyLoad, restDays, readiness, sleep, shortNightStreak } = input
  const found: Insight[] = []

  const band = acwr != null ? acwrBand(acwr) : null
  const loadClimbing = band === "caution" || band === "high"

  // The headline case: the body is saying no while the training is saying more.
  // Neither number is alarming on its own, which is exactly why this is worth
  // spelling out.
  if (loadClimbing && readiness.deviation === "below" && readiness.value != null) {
    found.push({
      key: "load-spike-low-readiness",
      tone: "critical",
      headline: "Load is climbing while you are recovering slowly",
      body:
        `Your acute:chronic ratio is ${acwr!.toFixed(2)} (${ACWR_BAND_LABEL[band].toLowerCase()}) ` +
        `and today's readiness of ${Math.round(readiness.value)} sits below your normal range. ` +
        `Ramping load is what builds capacity, but doing it through a dip is where soft-tissue ` +
        `injuries come from. Consider holding this week's volume flat rather than adding to it.`,
      href: "/trends/load",
      hrefLabel: "See the load trend",
    })
  } else if (band === "high" && acwr != null) {
    found.push({
      key: "load-spike",
      tone: "warning",
      headline: "This week is well above what you are adapted to",
      body:
        `You have done ${Math.round(weeklyLoad)} units of load in seven days - an acute:chronic ` +
        `ratio of ${acwr.toFixed(2)}. That is a genuine overload block if it is deliberate, and a ` +
        `warning if it is not. Either way it is not somewhere to stay for more than a week or two.`,
      href: "/trends/load",
      hrefLabel: "See the load trend",
    })
  }

  if (shortNightStreak >= SHORT_NIGHT_STREAK && sleep.value != null) {
    found.push({
      key: "sleep-debt",
      tone: "warning",
      headline: `${shortNightStreak} short nights in a row`,
      body:
        `Last night was ${hours(sleep.value)}, and it is the ${shortNightStreak}th consecutive ` +
        `night below your usual range. Sleep is the single largest input to tomorrow's readiness ` +
        `score, so this will show up in the numbers above before it shows up in how you feel.`,
      href: "/trends/body",
      hrefLabel: "See sleep history",
    })
  }

  if (restDays === 0) {
    found.push({
      key: "no-rest-days",
      tone: "warning",
      headline: "Seven days, no rest day",
      body:
        `Every day of the last week has a session on it. Monotony - training that never varies - ` +
        `is a stronger predictor of overuse problems than volume alone, and a full rest day is the ` +
        `cheapest way to break it.`,
      href: "/trends/load",
      hrefLabel: "See the load trend",
    })
  }

  // The good-news case, which matters: a system that only ever warns gets
  // ignored, and "you have room to push" is real, actionable information.
  const recoveredAndLight =
    readiness.deviation === "above" &&
    readiness.value != null &&
    (band === "low" || band === "optimal")

  if (recoveredAndLight) {
    found.push({
      key: "recovered-and-light",
      tone: "good",
      headline: "Recovered, with room to work",
      body:
        `Readiness is ${Math.round(readiness.value!)}, above your normal range, and your acute ` +
        `load is ${band === "low" ? "below" : "in line with"} your chronic base. If there is a ` +
        `hard session in this week's plan, today is the day for it.`,
      href: "/plan",
      hrefLabel: "Open the plan",
    })
  }

  // Suppressed when the case above already fired. Both describe the same light
  // week, but one of them also says what to do about it, and with a limit of
  // one the more useful framing has to be the one that survives.
  if (band === "low" && acwr != null && weeklyLoad > 0 && !recoveredAndLight) {
    found.push({
      key: "detraining",
      tone: "brand",
      headline: "You are training below your own baseline",
      body:
        `An acute:chronic ratio of ${acwr.toFixed(2)} means this week is markedly lighter than the ` +
        `four before it. That is exactly right for a taper or a recovery week; if it was not ` +
        `planned, this is the point where fitness starts drifting back down.`,
      href: "/trends/load",
      hrefLabel: "See the load trend",
    })
  }

  return found.slice(0, limit)
}

/**
 * How many of the most recent nights ran below the normal range, counting back
 * from today and stopping at the first normal one.
 *
 * Nights with no reading break the streak rather than being skipped: three bad
 * nights either side of a week the ring was not worn is not a run of three.
 */
export function countShortNightStreak(
  sleepSeries: ReadonlyArray<number | null | undefined>,
  low: number
): number {
  let streak = 0
  for (let i = sleepSeries.length - 1; i >= 0; i--) {
    const value = sleepSeries[i]
    if (value == null || !Number.isFinite(value) || value >= low) break
    streak++
  }
  return streak
}
