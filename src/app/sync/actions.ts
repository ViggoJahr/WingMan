"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { runSync } from "@/lib/services/syncOrchestrator"

export async function triggerSync() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  await runSync()
  redirect("/sync?synced=1")
}
