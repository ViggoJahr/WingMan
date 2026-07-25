import { Nav } from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MatchForm } from "./MatchForm"

export default function LogMatchPage() {
  return (
    <div className="flex flex-col">
      <Nav />
      <div className="flex justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Log match</CardTitle>
          </CardHeader>
          <CardContent>
            <MatchForm mode="create" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
