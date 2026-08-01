import { redirect } from "next/navigation"

/** Moved into the /trends tab group. Kept so existing bookmarks still land. */
export default function MovedPage() {
  redirect("/trends/load")
}
