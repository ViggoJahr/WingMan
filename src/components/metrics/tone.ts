/**
 * The four verdicts, and how each one is drawn.
 *
 * Kept as one module because the same four values now drive text colour, a
 * chip background, an SVG stroke and an SVG fill across six components. When
 * this lived as a `Record` inside StatTile, every new component that needed a
 * verdict colour re-declared its own copy and they drifted immediately - the
 * heatmap and the stat tile disagreed about what "critical" meant for a full
 * release.
 *
 * The CSS-variable strings exist separately from the Tailwind classes because
 * inline SVG cannot take a utility class for a `stroke` or `fill` and has to be
 * handed the variable directly.
 */

export type Tone = "good" | "warning" | "critical" | "neutral" | "brand"

export const TONE_TEXT: Record<Tone, string> = {
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
  neutral: "text-muted-foreground",
  brand: "text-brand",
}

/** For a value that should read as the page's main figure, not as a warning. */
export const TONE_VALUE_TEXT: Record<Tone, string> = {
  good: "text-foreground",
  warning: "text-foreground",
  critical: "text-foreground",
  neutral: "text-foreground",
  brand: "text-foreground",
}

export const TONE_STROKE: Record<Tone, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
  neutral: "var(--muted-foreground)",
  brand: "var(--brand-accent)",
}

/** The wash behind a stroke: bands, chips, gauge fills. */
export const TONE_SOFT: Record<Tone, string> = {
  good: "var(--status-good-soft)",
  warning: "var(--status-warning-soft)",
  critical: "var(--status-critical-soft)",
  neutral: "var(--track)",
  brand: "var(--brand-muted)",
}

export const TONE_CHIP: Record<Tone, string> = {
  good: "bg-status-good-soft text-status-good",
  warning: "bg-status-warning-soft text-status-warning",
  critical: "bg-status-critical-soft text-status-critical",
  neutral: "bg-track text-muted-foreground",
  brand: "bg-brand-muted text-brand",
}
