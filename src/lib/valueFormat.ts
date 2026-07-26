/**
 * Value formatting shared by charts.
 *
 * This lives outside any `"use client"` module on purpose. Server components
 * (ActivityHeatmap, and the pages themselves) need to call `formatValue`
 * during render, and exports of a client module are client *references* - the
 * server can pass them around but cannot invoke them.
 */

/**
 * Describes how to render a value, rather than being a formatter function.
 * Chart callers are server components, and a function prop cannot cross the
 * server/client boundary - passing one throws at render time.
 */
export interface ValueFormat {
  /** Fixed decimal places. Omit to print the number as-is. */
  decimals?: number
  /** Thousands separators, e.g. for step counts. */
  grouped?: boolean
  prefix?: string
  suffix?: string
}

export function formatValue(value: number, format?: ValueFormat): string {
  const { decimals, grouped = false, prefix = "", suffix = "" } = format ?? {}

  const body = grouped
    ? value.toLocaleString(undefined, {
        minimumFractionDigits: decimals ?? 0,
        maximumFractionDigits: decimals ?? 0,
      })
    : decimals != null
      ? value.toFixed(decimals)
      : String(value)

  return `${prefix}${body}${suffix}`
}
