/**
 * Telling "your credential is dead" apart from "the network hiccupped".
 *
 * The distinction matters because the two need opposite responses. A transient
 * failure fixes itself on tomorrow's cron and should be ignored. A dead
 * credential never fixes itself - every subsequent run fails identically until
 * a human re-authenticates - so leaving it to the cron means silently syncing
 * nothing for days, which is exactly what happened between 2026-08-01 and
 * 2026-08-05: eight consecutive runs, two sources, one indistinguishable red
 * row each.
 *
 * Matched on the message text rather than on a status column because both
 * providers' failures arrive as opaque strings from a `fetch` or from the
 * Supabase client, and neither carries a machine-readable code by the time it
 * reaches `sync_runs.error_message`. That is fragile if a provider rewords its
 * errors, which is why `SIGNATURES` is a list of independent substrings rather
 * than one regex: a reworded message loses a match, it does not throw, and the
 * row still shows its raw text.
 */

/**
 * Substrings that only ever appear on an unrecoverable credential failure.
 *
 * Deliberately narrow. A false positive tells the athlete to go through a
 * reconnect flow they did not need, so anything ambiguous - a plain 401, a
 * timeout - is left out and treated as transient.
 */
const SIGNATURES = [
  // Supabase (TUGG) refresh-token rotation: the stored token was already spent.
  // This is terminal - the replacement was issued to whoever consumed it.
  "invalid refresh token",
  "already used",
  // Google OAuth: refresh token expired or the grant was withdrawn. Note that
  // an OAuth client left in "Testing" publishing status expires refresh tokens
  // after seven days, which produces exactly this.
  "invalid_grant",
  "expired or revoked",
  // Either provider rejecting the credential outright at sign-in.
  "sign-in failed",
] as const

export function isReauthRequired(message: string | null | undefined): boolean {
  if (!message) return false
  const haystack = message.toLowerCase()
  return SIGNATURES.some((signature) => haystack.includes(signature))
}

/** What to tell the athlete, per source. */
export const REAUTH_HINT: Record<string, string> = {
  tugg: "Your TUGG session expired and cannot be renewed automatically. Sign in again to restore syncing.",
  google_health:
    "Google revoked or expired the connection. Reauthorise to restore syncing. If this recurs weekly, the OAuth client is still in Testing mode - Google expires those refresh tokens after seven days.",
}

export function reauthHint(source: string): string {
  return REAUTH_HINT[source] ?? "This connection needs to be re-authenticated before syncing can resume."
}
