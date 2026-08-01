import { Card, CardContent } from "@/components/ui/card"
import { PageHeader, PageShell } from "@/components/PageShell"
import { InjuryForm } from "./InjuryForm"

export default function LogInjuryPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        title="Log an injury"
        description="Keeping a record is what lets a gap in training explain itself later."
      />
      <Card>
        <CardContent>
          <InjuryForm mode="create" />
        </CardContent>
      </Card>
    </PageShell>
  )
}
