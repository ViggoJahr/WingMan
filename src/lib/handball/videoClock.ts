// Translation between video time and match time.
//
// A single global offset cannot work: halftime length varies from match to
// match, so period 2 needs its own anchor. period_offsets stores the video-time
// second at which each period's clock reads 0:00, keyed by period number - set
// once per half by scrubbing to the throw-off and pressing a button.
//
// video_offset_seconds is canonical; period and clock_seconds are derived here
// at tag time and stored denormalised. That direction matters: re-deriving the
// clock after correcting an offset is one UPDATE, whereas reconstructing a video
// offset from a stored clock would be lossy.

/** Period number (as a jsonb string key) -> video-time seconds of that throw-off. */
export type PeriodOffsets = Record<string, number>

export interface MatchClock {
  period: number
  clockSeconds: number
}

/** Offsets as sorted [period, videoSeconds] pairs, ignoring malformed entries. */
function sortedEntries(offsets: PeriodOffsets): Array<[number, number]> {
  return Object.entries(offsets ?? {})
    .map(([period, seconds]) => [Number(period), Number(seconds)] as [number, number])
    .filter(([period, seconds]) => Number.isFinite(period) && Number.isFinite(seconds))
    .sort((a, b) => a[1] - b[1])
}

/**
 * Which period a given video position falls in: the latest period whose
 * throw-off has already happened. Returns null before the first throw-off, which
 * is warm-up footage rather than period 1.
 */
export function inferPeriod(offsets: PeriodOffsets, videoSeconds: number): number | null {
  let current: number | null = null
  for (const [period, start] of sortedEntries(offsets)) {
    if (videoSeconds >= start) current = period
  }
  return current
}

export function videoTimeToClock(
  offsets: PeriodOffsets,
  videoSeconds: number
): MatchClock | null {
  const period = inferPeriod(offsets, videoSeconds)
  if (period == null) return null

  const start = Number(offsets[String(period)])
  if (!Number.isFinite(start)) return null

  return { period, clockSeconds: Math.max(0, Math.round(videoSeconds - start)) }
}

/** Inverse of videoTimeToClock. Null when that period has no anchor yet. */
export function clockToVideoTime(
  offsets: PeriodOffsets,
  period: number,
  clockSeconds: number
): number | null {
  const start = Number(offsets?.[String(period)])
  if (!Number.isFinite(start)) return null
  return start + clockSeconds
}

/** Seconds as m:ss (or h:mm:ss past an hour), for raw video positions. */
export function formatVideoTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "-"

  const whole = Math.floor(seconds)
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const secs = whole % 60
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes)

  return hours > 0
    ? `${hours}:${mm}:${String(secs).padStart(2, "0")}`
    : `${mm}:${String(secs).padStart(2, "0")}`
}

/** Match clock as it would read on the hall scoreboard, e.g. "2 - 18:42". */
export function formatClock(period: number, clockSeconds: number): string {
  const minutes = Math.floor(clockSeconds / 60)
  const secs = Math.floor(clockSeconds % 60)
  return `${period} - ${minutes}:${String(secs).padStart(2, "0")}`
}

/**
 * What the event list shows per row: the match clock when the offsets allow it,
 * otherwise the raw video position, otherwise nothing (a backfilled event).
 */
export function describeEventTime(
  offsets: PeriodOffsets,
  videoOffsetSeconds: number | null,
  storedPeriod: number | null,
  storedClockSeconds: number | null
): string {
  if (storedPeriod != null && storedClockSeconds != null) {
    return formatClock(storedPeriod, storedClockSeconds)
  }
  if (videoOffsetSeconds != null) {
    const clock = videoTimeToClock(offsets, videoOffsetSeconds)
    return clock ? formatClock(clock.period, clock.clockSeconds) : formatVideoTime(videoOffsetSeconds)
  }
  return "-"
}
