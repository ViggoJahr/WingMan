import { randomBytes } from "crypto"
import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthUrl } from "@/lib/integrations/google_health/auth"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/login", request.url))

  const state = randomBytes(16).toString("hex")
  const response = NextResponse.redirect(getAuthUrl(state))
  response.cookies.set("google_health_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })
  return response
}
