import { CircleArrowDown, CircleArrowUp, CircleCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Deviation } from "@/lib/services/metricBaseline"
import { TONE_TEXT, type Tone } from "./tone"

/**
 * The one-line verdict under a figure: an icon, a colour, three words.
 *
 * Direction and judgement are carried separately, and strictly. The arrow is
 * chosen by which way the reading left its range; the colour is chosen by
 * whether that is a problem. So weight above its normal range gets an up arrow
 * in the muted tone - the app reports the direction and declines to have an
 * opinion, which is the honest position for a metric with no better direction.
 *
 * An earlier version substituted a dash icon in that case, which read as "no
 * change" directly beside the words "Above normal".
 */

const DEVIATION_ICON = {
  below: CircleArrowDown,
  normal: CircleCheck,
  above: CircleArrowUp,
} as const

export function Verdict({
  deviation,
  label,
  tone,
  className,
}: {
  deviation: Deviation | null
  label: string | null
  tone: Tone
  className?: string
}) {
  if (deviation == null || label == null) return null
  const Icon = DEVIATION_ICON[deviation]

  return (
    <p className={cn("flex items-center gap-1.5 text-sm font-medium", TONE_TEXT[tone], className)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </p>
  )
}
