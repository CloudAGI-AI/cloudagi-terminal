import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Each test file runs in a separate process so in-memory stores reset.
    pool: "forks",
    isolate: true,
    include: ["src/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts", "src/test-utils/**"],
    },
    setupFiles: ["src/test-utils/setup.ts"],
  },
});
