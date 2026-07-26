import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-3 p-8">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        That page doesn&apos;t exist, or the session it pointed at has been deleted.
      </p>
      <Link
        href="/"
        className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-accent"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
