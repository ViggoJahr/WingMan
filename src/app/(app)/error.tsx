"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Server-thrown errors arrive here with their message stripped in
    // production, so log what we do have for the browser console / Vercel.
    console.error("Page error:", error)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page couldn&apos;t load. The rest of the app should still work.
        </p>
      </div>

      <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs text-muted-foreground">
        {error.message || "Unknown error"}
        {error.digest && `\n\nDigest: ${error.digest}`}
      </pre>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/"
          className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-accent"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
