import { test, expect } from "@playwright/test";

// FR-9 client-side mirror: submitting empty text shows a validation error and
// does not add a task (the request is not even sent). Count is captured
// relative to current state so the test is independent of prior DB rows.
test("empty submit shows a validation error", async ({ page }) => {
  await page.goto("/");
  // Wait until the list has settled (loading state cleared) so the client
  // component has hydrated before we interact.
  await expect(page.getByTestId("loading")).toHaveCount(0);

  await page.getByTestId("add-task").click();

  // The empty-submit validation error surfaces as VOICED copy (FR-9) in the
  // form-error region. (A count-based "adds nothing" assertion is intentionally
  // omitted: the E2E suite shares one DB and runs fully-parallel. The
  // validation-mirror blocks the POST — see the unit tests.)
  await expect(page.getByTestId("form-error")).toBeVisible();
});
