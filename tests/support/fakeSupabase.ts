/**
 * A minimal in-memory stand-in for the PostgREST query builder.
 *
 * The suite has been pure-functions-only by design, which left sessionMerge -
 * the subtlest code in the repo, and the only code that *mutates* data -
 * completely untested. This is the smallest thing that closes that gap: it
 * implements exactly the operators sessionMerge uses and nothing else, so it
 * cannot quietly diverge into a half-built ORM.
 *
 * Rows are plain objects held in a Map keyed by table name. Updates mutate them
 * in place and are recorded, so a test can assert on what was written as well
 * as on what was returned.
 */

export type Row = Record<string, unknown>

export interface RecordedUpdate {
  table: string
  patch: Row
  matched: Row[]
}

type Predicate = (row: Row) => boolean

class FakeQuery implements PromiseLike<{ data: Row[] | null; error: { message: string } | null }> {
  private predicates: Predicate[] = []
  private patch: Row | null = null
  private sortKey: { column: string; ascending: boolean } | null = null

  constructor(
    private readonly table: string,
    private readonly rows: Row[],
    private readonly updates: RecordedUpdate[],
    private readonly failOn: ReadonlySet<string>
  ) {}

  select() {
    return this
  }

  update(patch: Row) {
    this.patch = patch
    return this
  }

  eq(column: string, value: unknown) {
    this.predicates.push((row) => row[column] === value)
    return this
  }

  /** `.is(col, null)` - PostgREST's null check. */
  is(column: string, value: unknown) {
    this.predicates.push((row) => (row[column] ?? null) === value)
    return this
  }

  /** Only the `.not(col, "is", null)` form is used. */
  not(column: string, _operator: string, value: unknown) {
    this.predicates.push((row) => (row[column] ?? null) !== value)
    return this
  }

  gte(column: string, value: string) {
    this.predicates.push((row) => String(row[column]) >= value)
    return this
  }

  in(column: string, values: readonly unknown[]) {
    this.predicates.push((row) => values.includes(row[column]))
    return this
  }

  order(column: string, { ascending }: { ascending: boolean }) {
    this.sortKey = { column, ascending }
    return this
  }

  private resolve() {
    if (this.failOn.has(this.table)) {
      return { data: null, error: { message: `fake failure on ${this.table}` } }
    }

    const matched = this.rows.filter((row) => this.predicates.every((p) => p(row)))

    if (this.patch) {
      for (const row of matched) Object.assign(row, this.patch)
      this.updates.push({ table: this.table, patch: this.patch, matched })
      return { data: matched, error: null }
    }

    const sorted = this.sortKey
      ? [...matched].sort((a, b) => {
          const key = this.sortKey!.column
          const order = String(a[key]) < String(b[key]) ? -1 : String(a[key]) > String(b[key]) ? 1 : 0
          return this.sortKey!.ascending ? order : -order
        })
      : matched

    return { data: sorted, error: null }
  }

  then<TResult1 = { data: Row[] | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected)
  }
}

export function fakeSupabase(
  tables: Record<string, Row[]>,
  options: { failOn?: readonly string[] } = {}
) {
  const store = new Map(Object.entries(tables).map(([name, rows]) => [name, rows]))
  const updates: RecordedUpdate[] = []
  const failOn = new Set(options.failOn ?? [])

  const client = {
    from(table: string) {
      if (!store.has(table)) store.set(table, [])
      return new FakeQuery(table, store.get(table)!, updates, failOn)
    },
  }

  return {
    client,
    updates,
    /** Current state of a table, after any updates. */
    rows: (table: string) => store.get(table) ?? [],
  }
}
