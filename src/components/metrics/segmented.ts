import { cn } from "@/lib/utils"

/**
 * The pill group, as class strings rather than a component.
 *
 * Four surfaces need this shape - the trends tabs, the range pills, the plan
 * page's resource filter, and the session-type filter - and they cannot share a
 * component: two are client components driving search params through
 * `useSearchParams`, two are plain server-rendered links, and one of them wraps
 * its items in a `<form>`. Sharing the *styling* is the part that was actually
 * duplicated, and the part that had already drifted into three different border
 * radii.
 *
 * Kept React-free so a server page and a `"use client"` module can both import
 * it without dragging a component boundary along.
 */

export const SEGMENTED_GROUP =
  "flex items-center gap-0.5 rounded-full bg-surface-sunken p-1 text-sm"

export function segmentedItem(active: boolean, className?: string) {
  return cn(
    "rounded-full px-3 py-1 font-medium whitespace-nowrap transition-colors",
    active
      ? "bg-surface-raised text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground",
    className
  )
}
