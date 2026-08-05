import Link from "next/link"
import { HeartCrack } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader, PageShell } from "@/components/PageShell"
import { SectionHeading } from "@/components/metrics/SectionHeading"
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/dates"
import {
  INJURY_GRADE_TONE,
  injuryDurationDays,
  injuryGradeLabel,
  injurySiteLabel,
  type InjuryGrade,
} from "@/lib/injuries"
import { clearInjury, deleteInjury } from "../log/injury/actions"

type InjuryRow = {
  id: string
  type: string | null
  grade: string | null
  injured_date: string
  cleared_date: string | null
  description: string | null
}

function InjuryItem({ injury, open }: { injury: InjuryRow; open: boolean }) {
  const days = injuryDurationDays(injury.injured_date, injury.cleared_date)
  const grade = injuryGradeLabel(injury.grade)

  return (
    <li
      className={cn(
        "flex flex-col gap-2.5 rounded-xl bg-card p-4 ring-1",
        // An open injury is the one thing on this page that should catch the
        // eye from across the list, so it carries the status ring rather than
        // relying on being in the upper group.
        open ? "ring-status-critical/30" : "ring-foreground/10"
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
          <HeartCrack className="size-4" aria-hidden />
        </span>
        <span className="font-medium">{injurySiteLabel(injury.type)}</span>
        {grade && (
          <span className={cn("text-xs", INJURY_GRADE_TONE[injury.grade as InjuryGrade])}>
            {grade}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {formatDate(injury.injured_date)}
          {injury.cleared_date ? ` - ${formatDate(injury.cleared_date)}` : " - ongoing"}
          {` (${days}d)`}
        </span>
      </div>

      {injury.description && (
        <p className="text-sm text-muted-foreground">{injury.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {open && (
          <form action={clearInjury.bind(null, injury.id)}>
            <button
              type="submit"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Mark cleared
            </button>
          </form>
        )}
        <Link
          href={`/injuries/${injury.id}/edit`}
          className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
        >
          Edit
        </Link>
        <ConfirmDeleteButton
          action={deleteInjury.bind(null, injury.id)}
          confirmText="Delete this injury record? This cannot be undone."
        />
      </div>
    </li>
  )
}

export default async function InjuriesPage() {
  const supabase = await createClient()

  const { data: injuries } = await supabase
    .from("injuries")
    .select("id, type, grade, injured_date, cleared_date, description")
    .order("injured_date", { ascending: false })

  const rows = (injuries ?? []) as InjuryRow[]
  const open = rows.filter((injury) => injury.cleared_date == null)
  const healed = rows.filter((injury) => injury.cleared_date != null)

  return (
    <PageShell>
      <PageHeader
        title="Injuries"
        description="What has interrupted training, and for how long."
        actions={
          <Link href="/log/injury" className={cn(buttonVariants({ size: "sm" }))}>
            + Log injury
          </Link>
        }
      />

      <section className="flex flex-col gap-3">
        <SectionHeading
          action={
            open.length > 0 ? (
              <span className="rounded-full bg-status-critical-soft px-2.5 py-0.5 text-sm font-medium text-status-critical">
                {open.length}
              </span>
            ) : undefined
          }
        >
          Open
        </SectionHeading>
        {open.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {open.map((injury) => (
              <InjuryItem key={injury.id} injury={injury} open />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing open. Long may it last.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading>Healed</SectionHeading>
        {healed.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {healed.map((injury) => (
              <InjuryItem key={injury.id} injury={injury} open={false} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No injuries recorded yet.{" "}
            <Link href="/log/injury" className="underline">
              Log one
            </Link>{" "}
            when something goes wrong.
          </p>
        )}
      </section>
    </PageShell>
  )
}
