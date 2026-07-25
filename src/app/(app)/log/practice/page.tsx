import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PracticeForm } from "./PracticeForm"

export default function LogPracticePage() {
  return (
    <div className="flex justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Log practice</CardTitle>
          </CardHeader>
          <CardContent>
            <PracticeForm mode="create" />
          </CardContent>
        </Card>
      </div>
  )
}
