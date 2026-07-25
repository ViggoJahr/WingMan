import { Nav } from "@/components/nav"
import { BottomNav } from "@/components/BottomNav"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col pb-14 sm:pb-0">
      <Nav />
      {children}
      <BottomNav />
    </div>
  )
}
