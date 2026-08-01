import { cn } from "@/lib/utils"

/**
 * The page frame, declared once.
 *
 * Seventeen pages had hand-copied `mx-auto flex w-full max-w-Nxl flex-col gap-6
 * p-4`, with the max-width and the gap drifting between them for no reason
 * anyone recorded - and several carried a stray extra indent level left over
 * from a wrapper that was removed. Widths are named rather than numeric so the
 * choice reads as an intent ("this is a reading column") instead of a number
 * someone has to reverse-engineer.
 */
const WIDTH = {
  /** Short single-column pages: errors, not-found, the mobile overflow. */
  narrow: "max-w-2xl",
  /** The default, and what nearly every page already used. */
  regular: "max-w-3xl",
  /** The dashboard - a six-tile grid needs the extra column. */
  wide: "max-w-4xl",
  /** Match review only: video beside a clip list. */
  full: "max-w-6xl",
} as const

export function PageShell({
  width = "regular",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { width?: keyof typeof WIDTH }) {
  return (
    <div
      className={cn("mx-auto flex w-full flex-col gap-6 p-4", WIDTH[width], className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Title plus optional subtitle and a trailing action slot.
 *
 * The title/description pair was rebuilt by hand on every page, which is how
 * fourteen copies of `text-2xl font-semibold` ended up in the tree. `actions`
 * exists because roughly half of them needed a button beside the heading and
 * each solved the alignment differently.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
