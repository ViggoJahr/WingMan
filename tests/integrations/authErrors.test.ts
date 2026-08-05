import { describe, expect, it } from "vitest"
import { isReauthRequired, reauthHint } from "@/lib/integrations/authErrors"

describe("isReauthRequired", () => {
  it("recognises the real messages that stopped syncing on 2026-08-01", () => {
    // Verbatim from sync_runs. If a provider rewords these the detector goes
    // quiet rather than wrong, which is why they are pinned as literals.
    expect(
      isReauthRequired("TUGG session refresh failed: Invalid Refresh Token: Already Used")
    ).toBe(true)
    expect(
      isReauthRequired(
        'Google token request failed: 400 { "error": "invalid_grant", "error_description": "Token has been expired or revoked." }'
      )
    ).toBe(true)
  })

  it("catches a failed sign-in", () => {
    expect(isReauthRequired("TUGG sign-in failed: Invalid login credentials")).toBe(true)
  })

  it("is case-insensitive", () => {
    expect(isReauthRequired("INVALID_GRANT")).toBe(true)
  })

  it("leaves transient failures alone", () => {
    // A false positive sends the athlete through a reconnect flow they did not
    // need, so anything that tomorrow's cron might fix has to stay false.
    expect(isReauthRequired("fetch failed")).toBe(false)
    expect(isReauthRequired("TUGG fetch workout_sessions failed: timeout")).toBe(false)
    expect(isReauthRequired("Failed to upsert session for run abc: deadlock detected")).toBe(false)
    expect(isReauthRequired("Google token request failed: 503 Service Unavailable")).toBe(false)
  })

  it("does not flag a bare 401, which is ambiguous", () => {
    expect(isReauthRequired("Request failed: 401 Unauthorized")).toBe(false)
  })

  it("handles the empty cases", () => {
    expect(isReauthRequired(null)).toBe(false)
    expect(isReauthRequired(undefined)).toBe(false)
    expect(isReauthRequired("")).toBe(false)
  })
})

describe("reauthHint", () => {
  it("names the seven-day Testing-mode expiry for Google", () => {
    // The recurrence people lose days to: an OAuth client left unpublished
    // expires refresh tokens weekly, so "reconnect" alone would be a treadmill.
    expect(reauthHint("google_health")).toContain("Testing")
  })

  it("falls back for a source it has no copy for", () => {
    expect(reauthHint("strava")).toContain("re-authenticated")
  })
})
