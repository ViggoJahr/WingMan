import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encrypt } from "@/lib/crypto"
import { exchangeCode } from "@/lib/integrations/google_health/auth"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const expectedState = request.cookies.get("google_health_oauth_state")?.value

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?error=google_health_state", request.url))
  }

  try {
    const tokens = await exchangeCode(code)
    if (!tokens.refreshToken) {
      throw new Error(
        "Google did not return a refresh token - revoke prior access at myaccount.google.com/permissions and try again"
      )
    }

    const { error } = await supabase.from("integration_accounts").upsert(
      {
        user_id: user.id,
        source: "google_health",
        auth_type: "oauth2",
        access_token: encrypt(tokens.accessToken),
        refresh_token: encrypt(tokens.refreshToken),
        expires_at: tokens.expiresAt,
        status: "active",
      },
      { onConflict: "user_id,source" }
    )
    if (error) throw new Error(error.message)

    const response = NextResponse.redirect(new URL("/settings?connected=google_health", request.url))
    response.cookies.delete("google_health_oauth_state")
    return response
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(message)}`, request.url)
    )
  }
}
