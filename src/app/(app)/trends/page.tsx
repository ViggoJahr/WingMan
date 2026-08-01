import { redirect } from "next/navigation"
import { TREND_TABS } from "@/lib/routes"

/** /trends itself has no content - land on the first tab. */
export default function TrendsIndexPage() {
  redirect(TREND_TABS[0].href)
}
