import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      // Throwaway key for tests only - never the real ENCRYPTION_KEY.
      ENCRYPTION_KEY: "t7fI5vRn09LLuTFmhBvW8D5llflX+tujdsOzQEeEV/c=",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
