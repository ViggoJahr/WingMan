import { NextResponse } from "next/server"
import { runSync } from "@/lib/services/syncOrchestrator"

export async function POST(request: Request) {
  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${process.env.SYNC_SHARED_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get("accountId") ?? undefined

  try {
    const results = await runSync(accountId)
    return NextResponse.json({ results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
