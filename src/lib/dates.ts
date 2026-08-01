/**
 * Shared date-window and date-formatting helpers.
 *
 * Every page that showed a trailing window used to inline
 * `new Date(Date.now() - N * 24 * 60 * 60 * 1000)`, which duplicated the
 * arithmetic and tripped react-hooks/purity when called straight from a
 * component body.
 *
 * The *Iso helpers return calendar dates in local time (yyyy-MM-dd) for
 * comparing against `date` columns; timestampDaysAgo returns a UTC instant for
 * comparing against timestamptz columns.
 *
 * Kept free of React and of "use client" so server pages, client components and
 * the chart layer can all read the same formatting.
 */

/**
 * Shifts an instant by the local UTC offset so that slicing the ISO string
 * yields *local* calendar fields rather than UTC ones. `length` picks how much
 * of `yyyy-MM-ddTHH:mm` to keep: 10 for a date column, 16 for a
 * `<input type="datetime-local">` value.
 */
function localIso(date: Date, length: 10 | 16): string {
  const shifted = new Date(date)
  shifted.setMinutes(shifted.getMinutes() - shifted.getTimezoneOffset())
  return shifted.toISOString().slice(0, length)
}

export function todayIso(from: Date = new Date()): string {
  return localIso(from, 10)
}

export function isoDaysAgo(days: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() - days)
  return localIso(d, 10)
}

export function timestampDaysAgo(days: number, from: Date = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/** Default value for a `<input type="datetime-local">`. */
export function nowLocalDatetime(from: Date = new Date()): string {
  return localIso(from, 16)
}

/** "12 Mar 2026, 19:30" - session lists and detail headers. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

/** "12 Mar" - dense contexts: chart axes and table rows. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
