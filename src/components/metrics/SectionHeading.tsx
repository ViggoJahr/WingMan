import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * A heading that sits on the page, not inside a card.
 *
 * This is the structural difference between the reference's home screen and
 * this app's previous one. Every group here used to be a Card with a CardTitle,
 * which put a border and a background around the words "Activity" and made six
 * unrelated groups look like six instances of the same thing. Lifting the
 * heading out leaves the cards to be the content, and lets a section hold two
 * cards, or a grid, or a single row, without inventing a nested container.
 */
export function SectionHeading({
  children,
  href,
  action,
  className,
}: {
  children: React.ReactNode
  /** Makes the whole heading a link to the fuller view of this section. */
  href?: string
  action?: React.ReactNode
  className?: string
}) {
  const title = (
    <h2 className="font-heading text-xl font-semibold tracking-tight">{children}</h2>
  )

  return (
    <div className={cn("flex items-center justify-between gap-3 pt-2", className)}>
      {href ? (
        <Link href={href} className="group/heading flex items-center gap-1.5 hover:text-brand">
          {title}
          <ArrowRight
            className="size-4 text-muted-foreground transition-transform group-hover/heading:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ) : (
        title
      )}
      {action}
    </div>
  )
}
