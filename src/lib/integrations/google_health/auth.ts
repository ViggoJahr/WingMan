const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"

const SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
]

function redirectUri() {
  return process.env.GOOGLE_HEALTH_REDIRECT_URI!
}

export function getAuthUrl(state: string) {
  const url = new URL(AUTH_URL)
  url.searchParams.set("client_id", process.env.GOOGLE_HEALTH_CLIENT_ID!)
  url.searchParams.set("redirect_uri", redirectUri())
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", SCOPES.join(" "))
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("state", state)
  return url.toString()
}

export interface TokenSet {
  accessToken: string
  refreshToken: string | null
  expiresAt: string
}

async function requestToken(body: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  })
  if (!res.ok) {
    throw new Error(`Google token request failed: ${res.status} ${await res.text()}`)
  }
  const json = await res.json()
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: new Date(Date.now() + json.expires_in * 1000).toISOString(),
  }
}

export function exchangeCode(code: string) {
  return requestToken({
    code,
    client_id: process.env.GOOGLE_HEALTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET!,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  })
}

export function refreshAccessToken(refreshToken: string) {
  return requestToken({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_HEALTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET!,
    grant_type: "refresh_token",
  })
}
