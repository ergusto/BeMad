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
    // Coverage gate (AD-13, Story 4.2). Only computed/enforced when run with
    // `--coverage` (i.e. `npm run test:coverage`); a plain `npm test` is
    // unaffected.
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "html"],
      // Vitest (node env) owns the LOGIC layer: the `.ts` modules in lib/ plus
      // the API route handlers. React components (`.tsx`) are rendered and
      // exercised by the Playwright E2E suite (see tests/e2e/), NOT by Vitest —
      // counting them here would report "not unit-tested" for code that IS
      // covered elsewhere and understate reality. Vitest 4 includes all files
      // matching `include` by default (even un-imported ones), so a new, untested
      // `.ts` logic file drags the number down and the gate catches it.
      // What-is-covered-where is documented in docs/qa/test-coverage.md.
      include: ["lib/**", "app/api/**"],
      exclude: ["**/*.tsx"],
      // AD-13 requires ≥70% meaningful coverage. The measured logic-layer
      // coverage is ~94%; the gate is set well above the floor with headroom so
      // it catches real regressions without flaking on a one-line change.
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
