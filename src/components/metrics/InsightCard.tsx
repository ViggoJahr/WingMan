import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { TONE_CHIP, type Tone } from "./tone"

/**
 * The narrated card: a headline that reads like a sentence, then the numbers
 * that justify it.
 *
 * The reference leads its home screen with one of these and it is the only
 * element on the page that tells you what to *do*. Everything else reports.
 *
 * Kept to a single card, and only when there is something to say - the failure
 * mode of this pattern is a permanent slot that has to be filled every day,
 * which is how you end up generating "your sleep was 7h 12m" and calling it an
 * insight. `buildInsights` returns an empty list on an ordinary day and the
 * section disappears.
 */

export function InsightCard({
  icon: Icon,
  tone = "brand",
  headline,
  body,
  href,
  hrefLabel = "View",
  className,
}: {
  icon: LucideIcon
  tone?: Tone
  headline: string
  body: string
  href?: string
  hrefLabel?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        // The tint is a gradient rather than a flat wash so the card has a
        // direction to it - the reference's insight cards all glow from one
        // corner, which is what stops them reading as an alert banner.
        "relative overflow-hidden rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        "bg-linear-to-br from-brand-muted/60 via-card to-card",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE_CHIP[tone])}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>

        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-heading leading-snug font-semibold">{headline}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>

          {href && (
            <Link
              href={href}
              className="group/insight mt-1 flex w-fit items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              {hrefLabel}
              <ArrowRight
                className="size-3.5 transition-transform group-hover/insight:translate-x-0.5"
                aria-hidden
              />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
