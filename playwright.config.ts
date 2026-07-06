import { defineConfig, devices } from "@playwright/test";

// E2E suite scaffold. Real specs (core flows, states, a11y via
// @axe-core/playwright) are added across Epics 1–4. The `test` compose profile
// provides an isolated database for these runs (AD-13).
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Boot the app for E2E. Requires DATABASE_URL in the environment (point it at
  // a test database). Browsers install via `npx playwright install`.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
