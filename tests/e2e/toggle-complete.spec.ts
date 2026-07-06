import { test, expect } from "@playwright/test";

// FR-4/FR-6: toggle completion on and off, with the completed visual
// distinction, persisting across reloads.
test("toggle a task complete and active, persisting across reload", async ({
  page,
}) => {
  const unique = `e2e toggle ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByText(/loading/i)).toHaveCount(0);
  await page.getByLabel("New task").fill(unique);
  await page.getByRole("button", { name: /add task/i }).click();

  const row = page.locator("li", { hasText: unique });
  await expect(row).toBeVisible();
  await expect(row.getByRole("checkbox")).not.toBeChecked();

  // Complete it (click, not check(), because the control disables mid-request).
  await row.getByRole("checkbox").click();
  await expect(row.getByRole("checkbox")).toBeChecked();
  await expect(row).toHaveAttribute("data-completed", "true");

  // Persists as completed across reload.
  await page.reload();
  await expect(page.getByText(/loading/i)).toHaveCount(0);
  const afterComplete = page.locator("li", { hasText: unique });
  await expect(afterComplete.getByRole("checkbox")).toBeChecked();
  await expect(afterComplete).toHaveAttribute("data-completed", "true");

  // Reactivate (bi-directional).
  await afterComplete.getByRole("checkbox").click();
  await expect(afterComplete.getByRole("checkbox")).not.toBeChecked();

  // Persists as active across reload.
  await page.reload();
  await expect(page.getByText(/loading/i)).toHaveCount(0);
  const afterReactivate = page.locator("li", { hasText: unique });
  await expect(afterReactivate.getByRole("checkbox")).not.toBeChecked();
  await expect(afterReactivate).toHaveAttribute("data-completed", "false");
});
