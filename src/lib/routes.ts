// The app's route list, declared once.
//
// This existed in three places before: a flat row of 11 links in nav.tsx, four
// tabs in BottomNav.tsx, and a grouped set in more/page.tsx - in three
// different orders, with only the last carrying any information architecture.
// Adding a screen meant remembering all three, and the desktop nav had drifted
// into an ungrouped list nobody could scan.
//
// Kept free of React so a server component, a client component and a server
// action can all read it. The icons are lucide component references, which is
// fine to import anywhere; what is not fine is passing one *through* the
// server/client boundary as a prop, so consumers import this module directly
// rather than being handed routes.

import {
  Activity,
  CalendarDays,
  Dumbbell,
  Gauge,
  HeartPulse,
  Home,
  ListFilter,
  Menu,
  Plus,
  RefreshCw,
  Settings,
  Target,
  type LucideIcon,
} from "lucide-react"

export type RouteGroup = "primary" | "trends" | "reference" | "account"

export interface AppRoute {
  href: string
  label: string
  icon: LucideIcon
  group: RouteGroup
}

export const ROUTES: readonly AppRoute[] = [
  { href: "/", label: "Home", icon: Home, group: "primary" },
  { href: "/history", label: "History", icon: ListFilter, group: "primary" },
  { href: "/log", label: "Log", icon: Plus, group: "primary" },

  { href: "/training-load", label: "Training load", icon: Activity, group: "trends" },
  { href: "/readiness", label: "Readiness", icon: Gauge, group: "trends" },
  { href: "/handball", label: "Handball", icon: Target, group: "trends" },
  { href: "/health", label: "Body & recovery", icon: HeartPulse, group: "trends" },
  { href: "/tests", label: "Tests", icon: Dumbbell, group: "trends" },

  { href: "/plan", label: "Plan", icon: CalendarDays, group: "reference" },

  { href: "/sync", label: "Sync", icon: RefreshCw, group: "account" },
  { href: "/settings", label: "Settings", icon: Settings, group: "account" },
]

export const GROUP_LABEL: Record<RouteGroup, string> = {
  primary: "Overview",
  trends: "Trends",
  reference: "Reference",
  account: "Account",
}

/** Group order for any navigation that renders sections. */
export const GROUP_ORDER: readonly RouteGroup[] = ["primary", "trends", "reference", "account"]

export function routesInGroup(group: RouteGroup): AppRoute[] {
  return ROUTES.filter((route) => route.group === group)
}

/**
 * The mobile tab bar. Four targets is the ceiling at thumb width, so it carries
 * the primary group plus an overflow into /more - which is why /more is not a
 * route in ROUTES: it is a container for everything the bar cannot hold, not a
 * destination in its own right.
 */
export const MORE_ROUTE = { href: "/more", label: "More", icon: Menu } as const

export const TAB_ROUTES: readonly (AppRoute | typeof MORE_ROUTE)[] = [
  ...routesInGroup("primary"),
  MORE_ROUTE,
]

/** Groups /more spills onto the phone, in order. */
export const OVERFLOW_GROUPS: readonly RouteGroup[] = ["trends", "reference", "account"]

/**
 * Active-state test shared by every navigation surface. "/" has to match
 * exactly or it would light up on every route.
 */
export function isActiveRoute(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}
