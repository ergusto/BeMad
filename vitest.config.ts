import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve the `@/*` path alias from tsconfig natively (no extra plugin).
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    // Integration tests share one real Postgres and truncate between tests;
    // run test files sequentially so they don't clobber each other's rows.
    fileParallelism: false,
    include: [
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    // E2E is run by Playwright, not Vitest.
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      // Coverage thresholds are enforced in Epic 4 (Story 4.2), not here.
    },
  },
});
