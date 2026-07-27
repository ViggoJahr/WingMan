export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4" aria-busy>
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-md bg-muted" />
      <span className="sr-only">Loading</span>
    </div>
  )
}
