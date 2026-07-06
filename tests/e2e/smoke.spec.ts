import { test, expect } from "@playwright/test";

// Placeholder so the Playwright suite is runnable from the scaffold. The real
// E2E flows (create/edit/toggle/delete, empty/loading/error states,
// persistence, axe-core a11y) are added across Epics 1–4 — see Story 4.1.
test.skip("home page loads (real E2E arrives in later stories)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "BeMad" })).toBeVisible();
});
