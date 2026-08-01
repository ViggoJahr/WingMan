import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader, PageShell } from "@/components/PageShell"
import { createClient } from "@/lib/supabase/server"
import { injurySiteLabel } from "@/lib/injuries"
import { InjuryForm } from "../../../log/injury/InjuryForm"

export default async function EditInjuryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: injury } = await supabase
    .from("injuries")
    .select("id, type, grade, injured_date, cleared_date, description")
    .eq("id", id)
    .maybeSingle()

  if (!injury) notFound()

  return (
    <PageShell width="narrow">
      <PageHeader title={`Edit ${injurySiteLabel(injury.type).toLowerCase()} injury`} />
      <Card>
        <CardContent>
          <InjuryForm
            mode="edit"
            injuryId={injury.id}
            defaultValues={{
              type: injury.type,
              grade: injury.grade,
              injured_date: injury.injured_date,
              cleared_date: injury.cleared_date,
              description: injury.description,
            }}
          />
        </CardContent>
      </Card>
    </PageShell>
  )
}
