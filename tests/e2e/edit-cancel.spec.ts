import { test, expect } from "@playwright/test";

// AC #2: an invalid edit or a cancel retains the prior text.

test("cancelling an edit retains the original text", async ({ page }) => {
  const original = `e2e cancel ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByText(/loading/i)).toHaveCount(0);
  await page.getByLabel("New task").fill(original);
  await page.getByRole("button", { name: /add task/i }).click();
  const row = page.locator("li", { hasText: original });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Edit task").fill(`${original} DISCARDED`);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await expect(page.getByText(original, { exact: true })).toBeVisible();
  await expect(page.getByText(`${original} DISCARDED`)).toHaveCount(0);
});

test("an empty edit is rejected and the original text is retained", async ({
  page,
}) => {
  const original = `e2e invalid ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByText(/loading/i)).toHaveCount(0);
  await page.getByLabel("New task").fill(original);
  await page.getByRole("button", { name: /add task/i }).click();
  const row = page.locator("li", { hasText: original });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Edit task").fill("   ");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Error shown; still in edit mode; cancel restores the original.
  await expect(page.getByText(/must not be empty/i)).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText(original, { exact: true })).toBeVisible();
});
