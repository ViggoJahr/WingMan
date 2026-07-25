"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  READINESS_DIMENSIONS,
  describeValue,
  severityFor,
  type ReadinessField,
  type Severity,
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

const SEVERITY_TEXT: Record<Severity, string> = {
  good: "text-[var(--status-good)]",
  warning: "text-[var(--status-warning)]",
  critical: "text-[var(--status-critical)]",
}

const SEVERITY_BG: Record<Severity, string> = {
  good: "bg-[var(--status-good)]",
  warning: "bg-[var(--status-warning)]",
  critical: "bg-[var(--status-critical)]",
}

const SEVERITY_BORDER: Record<Severity, string> = {
  good: "border-[var(--status-good)]",
  warning: "border-[var(--status-warning)]",
  critical: "border-[var(--status-critical)]",
}

export function ReadinessForm({ date, previousScore }: { date: string; previousScore: number | null }) {
  const [values, setValues] = useState<Record<ReadinessField, number>>(DEFAULTS)

  return (
    <form action={logReadiness} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" defaultValue={date} required />
      </div>

      {previousScore != null && (
        <p className="text-xs text-muted-foreground">
          Previous score: {previousScore}/100 - blended with today&apos;s so one day doesn&apos;t swing it too
          much.
        </p>
      )}

      {READINESS_DIMENSIONS.map((dim) => {
        const value = values[dim.field]
        const severity = severityFor(dim, value)
        return (
          <div key={dim.field} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{dim.label}</Label>
              <span className={cn("text-sm font-semibold", SEVERITY_TEXT[severity])}>{value}/10</span>
            </div>
            <Slider
              min={0}
              max={10}
              step={1}
              value={[value]}
              indicatorClassName={SEVERITY_BG[severity]}
              thumbClassName={SEVERITY_BORDER[severity]}
              onValueChange={(v) => {
                const next = Array.isArray(v) ? v[0] : v
                setValues((prev) => ({ ...prev, [dim.field]: next }))
              }}
            />
            <p className={cn("text-xs leading-tight", SEVERITY_TEXT[severity])}>{describeValue(dim, value)}</p>
            <input type="hidden" name={dim.field} value={value} />
          </div>
        )
      })}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      <Button type="submit" className="mt-1">
        Save check-in
      </Button>
    </form>
  )
}
