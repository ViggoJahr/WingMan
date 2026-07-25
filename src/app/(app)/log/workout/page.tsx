import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkoutForm } from "./WorkoutForm"

export default function LogWorkoutPage() {
  return (
    <div className="flex justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Log a workout</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkoutForm mode="create" />
          </CardContent>
        </Card>
      </div>
  )
}
