import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { logReadiness } from "./actions"

function todayLocalDate() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

const badDirectionFields = [
  { name: "training_load", label: "Training load (0 = none, 10 = very high)" },
  { name: "muscle_soreness", label: "Muscle soreness (0 = none, 10 = very sore)" },
  { name: "mental_stress", label: "Mental stress (0 = none, 10 = very stressed)" },
  { name: "current_injury", label: "Injury (0 = none, 10 = severe)" },
  { name: "current_illness", label: "Illness (0 = none, 10 = severe)" },
]

const goodDirectionFields = [
  { name: "sleep_quality", label: "Sleep quality (0 = terrible, 10 = great)" },
  { name: "food_beverage", label: "Nutrition (0 = terrible, 10 = great)" },
  { name: "mood", label: "Mood (0 = terrible, 10 = great)" },
  { name: "recovery_energy", label: "Recovery / energy (0 = none, 10 = full)" },
]

export default function LogReadinessPage() {
  return (
    <div className="flex flex-col">
      <Nav />
      <div className="flex justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Daily readiness check-in</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={logReadiness} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={todayLocalDate()} required />
              </div>

              {badDirectionFields.map((field) => (
                <div key={field.name} className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min={0}
                    max={10}
                    defaultValue={0}
                    required
                  />
                </div>
              ))}
              {goodDirectionFields.map((field) => (
                <div key={field.name} className="flex flex-col gap-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min={0}
                    max={10}
                    defaultValue={5}
                    required
                  />
                </div>
              ))}

              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <Button type="submit" className="mt-2">
                Save check-in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
