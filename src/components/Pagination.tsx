import Link from "next/link"

/**
 * Previous/next links for the offset-paginated lists.
 *
 * Both callers fetch PAGE_SIZE + 1 rows and slice the extra off, which is how
 * `hasNext` is known without a second count query - see `paginationRange`.
 * The empty `<span/>` on page 0 keeps "Next" pinned right under justify-between.
 */
export function Pagination({
  page,
  hasNext,
  hrefFor,
}: {
  page: number
  hasNext: boolean
  hrefFor: (page: number) => string
}) {
  if (page === 0 && !hasNext) return null

  return (
    <div className="flex justify-between text-sm">
      {page > 0 ? (
        <Link href={hrefFor(page - 1)} className="underline">
          Previous
        </Link>
      ) : (
        <span />
      )}
      {hasNext && (
        <Link href={hrefFor(page + 1)} className="underline">
          Next
        </Link>
      )}
    </div>
  )
}

/**
 * Inclusive `.range()` bounds that fetch one row beyond the page, so the caller
 * can tell whether a next page exists without counting the whole table.
 */
export function paginationRange(page: number, pageSize: number): [number, number] {
  return [page * pageSize, page * pageSize + pageSize]
}

/** Splits an over-fetched result into the page itself and whether more follow. */
export function splitPage<T>(rows: T[] | null, pageSize: number): { items: T[]; hasNext: boolean } {
  const all = rows ?? []
  return { items: all.slice(0, pageSize), hasNext: all.length > pageSize }
}

/** Clamps a `?page=` search param to a non-negative integer. */
export function pageParam(value: string | undefined): number {
  const page = Math.floor(Number(value ?? 0))
  return Number.isFinite(page) && page > 0 ? page : 0
}
