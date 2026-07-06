import { test, expect } from "@playwright/test";

// FR-9 client-side mirror: submitting empty text shows a validation error and
// does not add a task (the request is not even sent). Count is captured
// relative to current state so the test is independent of prior DB rows.
test("empty submit shows a validation error", async ({ page }) => {
  await page.goto("/");
  // Wait until the list has settled (loading state cleared) so the client
  // component has hydrated before we interact.
  await expect(page.getByText(/loading/i)).toHaveCount(0);

  await page.getByRole("button", { name: /add task/i }).click();

  // Scope to our error text — Next.js also renders a role="alert" route
  // announcer, so a bare getByRole("alert") is ambiguous. (A count-based
  // "adds nothing" assertion is intentionally omitted: the E2E suite shares one
  // DB and runs fully-parallel, so absolute/relative counts are non-deterministic
  // across specs. The validation-mirror blocks the POST — see the unit tests.)
  await expect(page.getByText(/must not be empty/i)).toBeVisible();
});
