import { describe, expect, it } from "vitest"
import {
  TUGG_PAGE_SIZE,
  fetchPaged,
  type PagedQuery,
  type PagedSource,
} from "@/lib/integrations/tugg/client"

interface Row {
  id: number
  start_time: string
}

function rows(count: number, offset = 0): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: offset + i,
    start_time: `2026-0${((i % 9) + 1).toString()}-01T00:00:00Z`,
  }))
}

/**
 * Stands in for PostgREST. Records what it was asked so the test can assert on
 * the ordering and the range windows, not just the result.
 */
function fakeSource(all: Row[], opts: { error?: string } = {}) {
  const calls: Array<{ table: string; order?: string; gte?: [string, string]; range: [number, number] }> = []

  function makeQuery(table: string): PagedQuery<Row> {
    let orderColumn: string | undefined
    let gteFilter: [string, string] | undefined

    const query: PagedQuery<Row> = {
      order(column) {
        orderColumn = column
        return query
      },
      gte(column, value) {
        gteFilter = [column, value]
        return query
      },
      range(from, to) {
        calls.push({ table, order: orderColumn, gte: gteFilter, range: [from, to] })
        if (opts.error) return Promise.resolve({ data: null, error: { message: opts.error } })
        const matching = gteFilter
          ? all.filter((r) => String(r[gteFilter![0] as keyof Row]) >= gteFilter![1])
          : all
        return Promise.resolve({ data: matching.slice(from, to + 1), error: null })
      },
    }
    return query
  }

  const source: PagedSource<Row> = {
    from: (table) => ({ select: () => makeQuery(table) }),
  }

  return { source, calls }
}

describe("fetchPaged", () => {
  it("returns everything when the table fits in one page", async () => {
    const { source, calls } = fakeSource(rows(10))
    const result = await fetchPaged(source, "workout_sessions")

    expect(result).toHaveLength(10)
    expect(calls).toHaveLength(1)
  })

  it("keeps paging past the 1000-row PostgREST ceiling", async () => {
    // The bug this replaces: a plain select("*") returned exactly 1000 rows and
    // reported success, so 1400 sessions silently became 1000.
    const { source, calls } = fakeSource(rows(TUGG_PAGE_SIZE + 400))
    const result = await fetchPaged(source, "workout_sessions")

    expect(result).toHaveLength(TUGG_PAGE_SIZE + 400)
    expect(calls).toHaveLength(2)
    expect(calls[0].range).toEqual([0, TUGG_PAGE_SIZE - 1])
    expect(calls[1].range).toEqual([TUGG_PAGE_SIZE, TUGG_PAGE_SIZE * 2 - 1])
  })

  it("stops on a short page rather than requesting forever", async () => {
    const { source, calls } = fakeSource(rows(TUGG_PAGE_SIZE * 2 - 1))
    await fetchPaged(source, "exercise_progress")
    expect(calls).toHaveLength(2)
  })

  it("makes one extra request when the table is an exact multiple of the page", async () => {
    // A full final page is indistinguishable from "more to come", so the only
    // safe end signal is a short page - which costs one empty request.
    const { source, calls } = fakeSource(rows(TUGG_PAGE_SIZE))
    const result = await fetchPaged(source, "workout_sessions")

    expect(result).toHaveLength(TUGG_PAGE_SIZE)
    expect(calls).toHaveLength(2)
  })

  it("orders by id, so a row cannot land on two pages or none", async () => {
    const { source, calls } = fakeSource(rows(TUGG_PAGE_SIZE + 1))
    await fetchPaged(source, "workout_sessions")
    expect(calls.every((c) => c.order === "id")).toBe(true)
  })

  it("returns an empty array for an empty table", async () => {
    const { source } = fakeSource([])
    expect(await fetchPaged(source, "player_mas_tests")).toEqual([])
  })

  it("applies a since filter to every page when given one", async () => {
    const { source, calls } = fakeSource(rows(20))
    await fetchPaged(source, "endurance_runs", {
      since: { column: "start_time", value: "2026-05-01T00:00:00Z" },
    })
    expect(calls[0].gte).toEqual(["start_time", "2026-05-01T00:00:00Z"])
  })

  it("throws with the table name when the query fails", async () => {
    const { source } = fakeSource(rows(5), { error: "permission denied" })
    await expect(fetchPaged(source, "workout_plans")).rejects.toThrow(
      /TUGG fetch workout_plans failed: permission denied/
    )
  })
})
