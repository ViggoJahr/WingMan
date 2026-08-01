import { describe, expect, it } from "vitest"
import { toCsv } from "@/components/DataTable"

const columns = [
  { key: "source", header: "Source" },
  { key: "items", header: "Items" },
  { key: "note", header: "Note" },
]

describe("toCsv", () => {
  it("writes a header row followed by the data", () => {
    const csv = toCsv(columns, [{ source: "TUGG", items: 326, note: "" }])
    expect(csv).toBe("Source,Items,Note\nTUGG,326,")
  })

  it("quotes any value containing a comma", () => {
    // The failure this guards against is silent: an unquoted comma shifts every
    // later column by one and the file still opens.
    const csv = toCsv(columns, [{ source: "TUGG", items: 1, note: "failed, retried" }])
    expect(csv).toBe('Source,Items,Note\nTUGG,1,"failed, retried"')
  })

  it("doubles embedded quotes rather than emitting them raw", () => {
    const csv = toCsv(columns, [{ source: "x", items: 1, note: 'said "no"' }])
    expect(csv).toBe('Source,Items,Note\nx,1,"said ""no"""')
  })

  it("quotes values containing a newline", () => {
    const csv = toCsv(columns, [{ source: "x", items: 1, note: "line one\nline two" }])
    expect(csv).toBe('Source,Items,Note\nx,1,"line one\nline two"')
  })

  it("writes null and undefined as empty, not as the word null", () => {
    const csv = toCsv(columns, [{ source: null, items: 0, note: null }])
    expect(csv).toBe("Source,Items,Note\n,0,")
  })

  it("emits only the columns it is given, in that order", () => {
    // The export follows the visible columns, so hiding one must drop it.
    const csv = toCsv([{ key: "note", header: "Note" }, { key: "source", header: "Source" }], [
      { source: "TUGG", items: 326, note: "ok" },
    ])
    expect(csv).toBe("Note,Source\nok,TUGG")
  })

  it("produces a header-only file for no rows", () => {
    expect(toCsv(columns, [])).toBe("Source,Items,Note\n")
  })
})
