"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const

const noopSubscribe = () => () => {}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  // The active theme is only knowable on the client, so the server render has
  // to show no selection. useSyncExternalStore is the hydration-safe way to
  // ask "am I on the client yet" - a setState-in-effect flag would trigger a
  // cascading render (and trips react-hooks/set-state-in-effect).
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )

  return (
    <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Theme">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
