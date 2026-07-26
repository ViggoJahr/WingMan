/**
 * Shared date-window helpers.
 *
 * Every page that showed a trailing window used to inline
 * `new Date(Date.now() - N * 24 * 60 * 60 * 1000)`, which duplicated the
 * arithmetic and tripped react-hooks/purity when called straight from a
 * component body.
 *
 * The *Iso helpers return calendar dates in local time (yyyy-MM-dd) for
 * comparing against `date` columns; timestampDaysAgo returns a UTC instant for
 * comparing against timestamptz columns.
 */

function toLocalIsoDate(date: Date): string {
  const shifted = new Date(date)
  shifted.setMinutes(shifted.getMinutes() - shifted.getTimezoneOffset())
  return shifted.toISOString().slice(0, 10)
}

export function todayIso(from: Date = new Date()): string {
  return toLocalIsoDate(from)
}

export function isoDaysAgo(days: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() - days)
  return toLocalIsoDate(d)
}

export function timestampDaysAgo(days: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}
