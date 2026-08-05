import { Sidebar } from "@/components/Sidebar"
import { BottomNav } from "@/components/BottomNav"

/**
 * Two navigation surfaces, one route manifest. The sidebar owns desktop from
 * `sm` up; below that it is hidden entirely and the tab bar takes over, which
 * is why the main column carries bottom padding only on small screens.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      {/* Clears the floating tab bar - which is taller than the flush bar it
          replaced, and sits proud of the bottom edge - so the last card on a
          page is not permanently half-covered. */}
      <div className="flex min-w-0 flex-1 flex-col pb-24 sm:pb-0">{children}</div>
      <BottomNav />
    </div>
  )
}
