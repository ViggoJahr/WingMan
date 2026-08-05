import { cn } from "@/lib/utils"

/**
 * A chart, its title, and whatever has to sit under it.
 *
 * Replaces the Card/CardHeader/CardTitle/CardContent stack that every trend
 * page had rebuilt by hand - eleven copies, several of which had drifted into
 * putting the current value inside the title string ("Weight: 82.4 kg") because
 * there was nowhere else to put it. There is now: `hero`.
 *
 * `footnote` exists because half of these charts need a caveat about how the
 * number was derived, and those were previously loose <p> tags whose margins
 * disagreed from page to page.
 */
export function ChartCard({
  title,
  hero,
  action,
  children,
  footnote,
  className,
}: {
  title?: React.ReactNode
  /** A MetricHero, or anything that belongs above the plot. */
  hero?: React.ReactNode
  /** Range pills, a filter, a link out. */
  action?: React.ReactNode
  children: React.ReactNode
  footnote?: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        className
      )}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="font-heading font-medium">{title}</h2>}
          {/* ml-auto rather than relying on justify-between: a card with an
              action but no title has only one child, which justify-between
              parks on the left - which is how the readiness "Check in" button
              ended up floating above its own hero. */}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}

      {hero}

      {children}

      {footnote && <p className="text-xs leading-relaxed text-muted-foreground">{footnote}</p>}
    </section>
  )
}

/** The "nothing to draw yet" state, so every chart says it the same way. */
export function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-lg bg-surface-sunken p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
