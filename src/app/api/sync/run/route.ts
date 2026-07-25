import { NextResponse } from "next/server"
import { runSync } from "@/lib/services/syncOrchestrator"

async function runAndRespond(accountId?: string) {
  try {
    const results = await runSync(accountId)
    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Manual/dev trigger, e.g. from a script or curl - protected by our own secret.
export async function POST(request: Request) {
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${process.env.SYNC_SHARED_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  return runAndRespond(searchParams.get("accountId") ?? undefined)
}

// Vercel Cron calls this via GET and auto-attaches `Authorization: Bearer
// $CRON_SECRET` when that env var is set - see vercel.json.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return runAndRespond()
}
