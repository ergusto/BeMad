import { test, expect } from "@playwright/test";

// FR-5: delete requires a confirmation step; cancel keeps the task, confirm
// removes it, and the removal persists across reload.
test("delete requires confirmation; cancel keeps, confirm removes (persists)", async ({
  page,
}) => {
  const unique = `e2e delete ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByTestId("loading")).toHaveCount(0);
  await page.getByLabel("New task").fill(unique);
  await page.getByTestId("add-task").click();

  const row = page.locator("li", { hasText: unique });
  await expect(row).toBeVisible();

  // Trigger delete → a confirmation step appears (nothing removed yet).
  await row.getByTestId("delete").click();
  await expect(row.getByTestId("confirm-delete")).toBeVisible();

  // Cancel → the task is still present, confirmation gone.
  await row
    .getByTestId("cancel-delete")
    .click();
  await expect(row).toBeVisible();
  await expect(row.getByTestId("confirm-delete")).toHaveCount(0);

  // Delete again → Confirm → the task disappears.
  await row.getByTestId("delete").click();
  await row
    .getByTestId("confirm-delete")
    .click();
  await expect(page.locator("li", { hasText: unique })).toHaveCount(0);

  // Persists across reload.
  await page.reload();
  await expect(page.getByTestId("loading")).toHaveCount(0);
  await expect(page.locator("li", { hasText: unique })).toHaveCount(0);
});
