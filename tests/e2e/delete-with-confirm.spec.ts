import { test, expect } from "@playwright/test";

// FR-5: delete requires a confirmation step; cancel keeps the task, confirm
// removes it, and the removal persists across reload.
test("delete requires confirmation; cancel keeps, confirm removes (persists)", async ({
  page,
}) => {
  const unique = `e2e delete ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByText(/loading/i)).toHaveCount(0);
  await page.getByLabel("New task").fill(unique);
  await page.getByRole("button", { name: /add task/i }).click();

  const row = page.locator("li", { hasText: unique });
  await expect(row).toBeVisible();

  // Trigger delete → a confirmation step appears (nothing removed yet).
  await row.getByRole("button", { name: `Delete: ${unique}`, exact: true }).click();
  await expect(row.getByText("Delete this task?")).toBeVisible();

  // Cancel → the task is still present, confirmation gone.
  await row
    .getByRole("button", { name: `Cancel delete: ${unique}`, exact: true })
    .click();
  await expect(row).toBeVisible();
  await expect(row.getByText("Delete this task?")).toHaveCount(0);

  // Delete again → Confirm → the task disappears.
  await row.getByRole("button", { name: `Delete: ${unique}`, exact: true }).click();
  await row
    .getByRole("button", { name: `Confirm delete: ${unique}`, exact: true })
    .click();
  await expect(page.locator("li", { hasText: unique })).toHaveCount(0);

  // Persists across reload.
  await page.reload();
  await expect(page.getByText(/loading/i)).toHaveCount(0);
  await expect(page.locator("li", { hasText: unique })).toHaveCount(0);
});
