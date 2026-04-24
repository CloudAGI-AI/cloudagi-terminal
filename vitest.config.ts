import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/shared/vitest.config.ts",
      "apps/agent-sdk/vitest.config.ts",
      "apps/server/vitest.config.ts",
    ],
  },
});
