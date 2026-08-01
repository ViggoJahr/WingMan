"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatValue, type ValueFormat } from "@/lib/valueFormat"

/**
 * Sortable table with column visibility and CSV export, replacing the
 * hand-rolled `<table>` blocks on /handball and /sync.
 *
 * Columns are **serializable descriptors, not render functions.** Every caller
 * is a server component, and a function prop cannot cross that boundary - the
 * same constraint that made TrendChart take a `format` descriptor rather than a
 * formatter. `href` is therefore a template string with {placeholders} rather
 * than a callback.
 */

export type CellValue = string | number | boolean | null

export interface DataColumn {
  key: string
  header: string
  /** Numbers right-align so digits line up column-to-column. */
  align?: "left" | "right"
  format?: ValueFormat
  /**
   * Turns the cell into a link. `{key}` is replaced with that row's value, e.g.
   * "/sessions/{session_id}/review".
   */
  href?: string
  /** Starts hidden, available from the column menu. */
  hidden?: boolean
  /** Shown instead of the value when it is null or 0. */
  emptyText?: string
  /**
   * Colours a cell by its own value, e.g. `{ success: "good", error: "critical" }`.
   * A map rather than a predicate, so it survives the server/client boundary.
   */
  tones?: Record<string, CellTone>
  /** Long free text: clamp the column and expose the full value on hover. */
  truncate?: boolean
}

export type CellTone = "good" | "warning" | "critical" | "muted"

const TONE_CLASS: Record<CellTone, string> = {
  good: "text-status-good font-medium",
  warning: "text-status-warning font-medium",
  critical: "text-status-critical font-medium",
  muted: "text-muted-foreground",
}

export interface DataTableProps {
  columns: readonly DataColumn[]
  rows: ReadonlyArray<Record<string, CellValue>>
  /** Filename stem for the CSV export. */
  exportName: string
  /** Column key to sort by initially. */
  initialSort?: string
  initialDirection?: "asc" | "desc"
  emptyMessage?: string
  caption?: string
}

function renderTemplate(template: string, row: Record<string, CellValue>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(row[key] ?? ""))
}

function compare(a: CellValue, b: CellValue): number {
  // Nulls sort last in both directions - an absent value is not "smallest",
  // it is unknown, and floating it to the top buries the real data.
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

/** Exported for tests - quoting is the part that silently corrupts a file. */
export function toCsv(
  columns: readonly Pick<DataColumn, "key" | "header">[],
  rows: DataTableProps["rows"]
): string {
  const escape = (value: CellValue) => {
    const text = value == null ? "" : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const header = columns.map((c) => escape(c.header)).join(",")
  const body = rows.map((row) => columns.map((c) => escape(row[c.key])).join(",")).join("\n")
  return `${header}\n${body}`
}

export function DataTable({
  columns,
  rows,
  exportName,
  initialSort,
  initialDirection = "desc",
  emptyMessage = "Nothing to show yet.",
  caption,
}: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(initialSort ?? null)
  const [direction, setDirection] = useState<"asc" | "desc">(initialDirection)
  const [hidden, setHidden] = useState<ReadonlySet<string>>(
    () => new Set(columns.filter((c) => c.hidden).map((c) => c.key))
  )

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hidden.has(c.key)),
    [columns, hidden]
  )

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    const factor = direction === "asc" ? 1 : -1
    return [...rows].sort((a, b) => compare(a[sortKey], b[sortKey]) * factor)
  }, [rows, sortKey, direction])

  const toggleSort = useCallback((key: string) => {
    setSortKey((currentKey) => {
      if (currentKey === key) {
        setDirection((d) => (d === "asc" ? "desc" : "asc"))
        return key
      }
      setDirection("desc")
      return key
    })
  }, [])

  const toggleColumn = useCallback((key: string) => {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const download = useCallback(() => {
    // Exports what is on screen - the visible columns in the current order -
    // because an export that silently differs from the table is a support
    // question waiting to happen.
    const blob = new Blob([toCsv(visibleColumns, sortedRows)], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${exportName}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [visibleColumns, sortedRows, exportName])

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm">
                <Columns3 className="size-3.5" aria-hidden />
                Columns
              </Button>
            }
          />
          <PopoverContent align="end" className="w-52">
            <div className="flex flex-col gap-1">
              {columns.map((column) => (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-1.5 py-1 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    className="size-3.5"
                    checked={!hidden.has(column.key)}
                    onChange={() => toggleColumn(column.key)}
                  />
                  {column.header}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="sm" onClick={download}>
          <Download className="size-3.5" aria-hidden />
          CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => {
                const active = sortKey === column.key
                const Icon = !active ? ChevronsUpDown : direction === "asc" ? ArrowUp : ArrowDown
                return (
                  <TableHead
                    key={column.key}
                    aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
                    className={column.align === "right" ? "text-right" : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                        active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {column.header}
                      <Icon className="size-3 opacity-60" aria-hidden />
                    </button>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row, index) => (
              <TableRow key={String(row.id ?? index)}>
                {visibleColumns.map((column) => {
                  const value = row[column.key]
                  const isEmpty = value == null || value === "" || value === 0
                  const text =
                    isEmpty && column.emptyText
                      ? column.emptyText
                      : typeof value === "number"
                        ? formatValue(value, column.format)
                        : String(value ?? "-")

                  const tone = column.tones?.[String(value ?? "")]

                  return (
                    <TableCell
                      key={column.key}
                      title={column.truncate ? String(value ?? "") : undefined}
                      className={cn(
                        column.align === "right" && "text-right tabular-nums",
                        column.truncate && "max-w-xs truncate",
                        isEmpty && "text-muted-foreground",
                        tone && TONE_CLASS[tone]
                      )}
                    >
                      {column.href && !isEmpty ? (
                        <Link
                          href={renderTemplate(column.href, row)}
                          className="underline underline-offset-2 hover:text-brand"
                        >
                          {text}
                        </Link>
                      ) : (
                        text
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
