"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

// A row of tap targets backed by a hidden input, so it drops into a plain
// <form action={...}> exactly like an <Input> does - the same trick
// ReadinessForm already uses to get its Sliders into FormData.
//
// Chips rather than a slider or a stepper: sliders need precision aiming, and a
// stepper needs N taps to reach value N. The practice form has to be fillable
// one-handed in under 30 seconds or it stops being filled at all.

export interface ChipOption {
  value: string | number
  label: string
  hint?: string
}

// Exported so the controlled, self-saving chip rows (RpeQuickSet) look identical
// to the form-native ones without depending on this component's form plumbing.
export const CHIP_BASE =
  "rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50"
export const CHIP_ON = "border-transparent bg-primary text-primary-foreground font-medium"
export const CHIP_OFF = "text-muted-foreground hover:bg-accent hover:text-foreground"

export function ChipGroup({
  name,
  options,
  defaultValue,
  clearable = true,
  className,
}: {
  name: string
  options: readonly ChipOption[]
  defaultValue?: string | number | null
  /** Tapping the selected chip again clears it. Off for fields that must have a value. */
  clearable?: boolean
  className?: string
}) {
  const [selected, setSelected] = useState<string>(
    defaultValue == null || defaultValue === "" ? "" : String(defaultValue)
  )

  return (
    <div id={name} role="group" className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => {
        const value = String(option.value)
        const isOn = selected === value
        return (
          <button
            key={value}
            type="button"
            title={option.hint}
            aria-pressed={isOn}
            onClick={() => setSelected(isOn && clearable ? "" : value)}
            className={cn(CHIP_BASE, isOn ? CHIP_ON : CHIP_OFF)}
          >
            {option.label}
          </button>
        )
      })}
      <input type="hidden" name={name} value={selected} />
    </div>
  )
}

/**
 * Multi-select variant. Emits the chosen labels comma-joined, which is what
 * team_practices.practice_focus already stores, so no column change is needed.
 * The optional "Other" escape reveals a free-text input for the long tail.
 */
export function ChipMultiGroup({
  name,
  options,
  defaultValue,
  allowOther = false,
  otherPlaceholder,
  className,
}: {
  name: string
  options: readonly string[]
  defaultValue?: string | null
  allowOther?: boolean
  otherPlaceholder?: string
  className?: string
}) {
  const initial = (defaultValue ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  // Anything stored that isn't one of the presets came from a previous "Other",
  // so it seeds the free-text box rather than being silently dropped on edit.
  const [chosen, setChosen] = useState<string[]>(
    initial.filter((item) => options.includes(item))
  )
  const [other, setOther] = useState<string>(
    initial.filter((item) => !options.includes(item)).join(", ")
  )
  const [showOther, setShowOther] = useState<boolean>(
    () => initial.some((item) => !options.includes(item))
  )

  function toggle(option: string) {
    setChosen((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    )
  }

  // Collapsing "Other..." drops its text rather than silently submitting a value
  // the user can no longer see.
  const extra =
    allowOther && showOther ? other.split(",").map((p) => p.trim()).filter(Boolean) : []
  const combined = [...chosen, ...extra].join(", ")

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div id={name} role="group" className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isOn = chosen.includes(option)
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isOn}
              onClick={() => toggle(option)}
              className={cn(CHIP_BASE, isOn ? CHIP_ON : CHIP_OFF)}
            >
              {option}
            </button>
          )
        })}
        {allowOther && (
          <button
            type="button"
            aria-pressed={showOther}
            onClick={() => setShowOther((prev) => !prev)}
            className={cn(CHIP_BASE, showOther ? CHIP_ON : CHIP_OFF)}
          >
            Other...
          </button>
        )}
      </div>

      {allowOther && showOther && (
        <input
          type="text"
          value={other}
          onChange={(event) => setOther(event.target.value)}
          placeholder={otherPlaceholder}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      )}

      <input type="hidden" name={name} value={combined} />
    </div>
  )
}
