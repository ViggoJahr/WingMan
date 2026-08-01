import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader, PageShell } from "@/components/PageShell"
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
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Open
            {open.length > 0 && (
              <span className="ml-2 text-sm font-normal text-status-critical">{open.length}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {open.length > 0 ? (
            <ul className="flex flex-col divide-y">
              {open.map((injury) => (
                <InjuryItem key={injury.id} injury={injury} open />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing open. Long may it last.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Healed</CardTitle>
        </CardHeader>
        <CardContent>
          {healed.length > 0 ? (
            <ul className="flex flex-col divide-y">
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
        </CardContent>
      </Card>
    </PageShell>
  )
}
