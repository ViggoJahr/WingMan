import { TrendChart } from "@/components/charts/TrendChart"

export interface WeightPoint {
  date: string
  weight_kg: number
}

export function WeightChart({ data }: { data: WeightPoint[] }) {
  return (
    <TrendChart
      data={data.map((d) => ({ date: d.date, value: d.weight_kg }))}
      kind="line"
      color="chart-1"
      format={{ decimals: 1, suffix: " kg" }}
    />
  )
}

export interface StepsPoint {
  date: string
  steps: number
}

export function StepsChart({ data }: { data: StepsPoint[] }) {
  return (
    <TrendChart
      data={data.map((d) => ({ date: d.date, value: d.steps }))}
      kind="bar"
      color="chart-1"
      format={{ grouped: true, suffix: " steps" }}
    />
  )
}

export interface SleepPoint {
  date: string
  hours: number
}

export function SleepChart({ data }: { data: SleepPoint[] }) {
  return (
    <TrendChart
      data={data.map((d) => ({ date: d.date, value: d.hours }))}
      kind="bar"
      color="chart-1"
      format={{ decimals: 1, suffix: "h" }}
    />
  )
}
