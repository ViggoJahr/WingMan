import type { SourceAdapter } from "./types"
import { tuggAdapter } from "./tugg"
import { googleHealthAdapter } from "./google_health"

export const adapterRegistry: Record<string, SourceAdapter> = {
  tugg: tuggAdapter,
  google_health: googleHealthAdapter,
}
