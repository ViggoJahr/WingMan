import type { SourceAdapter } from "./types"
import { tuggAdapter } from "./tugg"

export const adapterRegistry: Record<string, SourceAdapter> = {
  tugg: tuggAdapter,
}
