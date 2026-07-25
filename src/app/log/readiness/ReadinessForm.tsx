"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import {
  READINESS_DIMENSIONS,
  WARNING_THRESHOLD,
  describeValue,
  type ReadinessField,
} from "@/lib/services/readinessDimensions"
import { logReadiness } from "./actions"

const DEFAULTS: Record<ReadinessField, number> = {
  training_load: 0,
  muscle_soreness: 0,
  mental_stress: 0,
  current_injury: 0,
  current_illness: 0,
  sleep_quality: 5,
  food_beverage: 5,
  mood: 5,
  recovery_energy: 5,
}

export function ReadinessForm({ date, previousScore }: { date: string; previousScore: number | null }) {
  const [values, setValues] = useState<Record<ReadinessField, number>>(DEFAULTS)

  const warnings = useMemo(() => {
    const list: { label: string; description: string }[] = []
    for (const field of ["current_injury", "current_illness"] as const) {
      if (values[field] >= WARNING_THRESHOLD) {
        const dim = READINESS_DIMENSIONS.find((d) => d.field === field)!
        list.push({ label: dim.label, description: describeValue(dim, values[field]) })
      }
    }
    return list
  }, [values])

  return (
    <form action={logReadiness} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={date} required />
      </div>

      {previousScore != null && (
        <p className="text-sm text-muted-foreground">
          Previous score: {previousScore}/100 - today&apos;s result is blended with it so one day doesn&apos;t
          swing the number too much.
        </p>
      )}

      {warnings.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Consider adjusting training</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w) => (
              <li key={w.label}>
                <span className="font-medium">{w.label}:</span> {w.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {READINESS_DIMENSIONS.map((dim) => (
        <div key={dim.field} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label>{dim.label}</Label>
            <span className="text-sm font-medium">{values[dim.field]}/10</span>
          </div>
          <Slider
            min={0}
            max={10}
            step={1}
            value={[values[dim.field]]}
            onValueChange={(v) => {
              const next = Array.isArray(v) ? v[0] : v
              setValues((prev) => ({ ...prev, [dim.field]: next }))
            }}
          />
          <p className="min-h-8 text-xs text-muted-foreground">{describeValue(dim, values[dim.field])}</p>
          <input type="hidden" name={dim.field} value={values[dim.field]} />
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
  )
}
