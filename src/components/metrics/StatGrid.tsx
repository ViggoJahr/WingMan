import { cn } from "@/lib/utils"

/**
 * The label-over-figure grid, declared once.
 *
 * Five pages had hand-built `<dl className="grid grid-cols-2 gap-4 text-sm">`
 * with a `<dt className="text-muted-foreground">` and a `<dd
 * className="font-medium">` per item - the session overview, the match box
 * score, the handball load bands, the practice detail and the sync summary.
 * They had already drifted to three different column counts and two different
 * gaps, and none of them set the figure at a size that distinguished it from
 * its own label.
 *
 * The `dl`/`dt`/`dd` markup is kept because it is the correct structure for
 * name/value pairs, and because globals.css already gives `dd` tabular figures
 * on that basis.
 */

export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3", className)}>
      {children}
    </dl>
  )
}

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: string
  /** Renders nothing at all when null - an empty stat is worse than no stat. */
  value: React.ReactNode
  hint?: React.ReactNode
  className?: string
}) {
  if (value == null || value === "") return null

  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-heading leading-tight font-semibold">
        {value}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  )
}

/** A titled block inside a card - "Heart-rate zones", "Your RPE". */
export function CardSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-2.5 border-t pt-4", className)}>
      <h3 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}
