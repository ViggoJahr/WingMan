import { createServerClient } from "@supabase/ssr"
import { createClient as createRawClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "./types"

// User-context client: respects RLS as the logged-in user (auth.uid()).
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component with no response to write to;
            // middleware refreshes the session on the next request instead.
          }
        },
      },
    }
  )
}

// Service-role client: bypasses RLS entirely. Only for trusted server-side
// contexts (sync jobs) writing on the user's behalf, never exposed to the browser.
export function createServiceRoleClient() {
  return createRawClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
