import { test, expect } from "@playwright/test";

// AC #2: an invalid edit or a cancel retains the prior text.

test("cancelling an edit retains the original text", async ({ page }) => {
  const original = `e2e cancel ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByTestId("loading")).toHaveCount(0);
  await page.getByLabel("New task").fill(original);
  await page.getByTestId("add-task").click();
  const row = page.locator("li", { hasText: original });
  await expect(row).toBeVisible();

  await row.getByTestId("edit").click();
  await page.getByLabel("Edit task", { exact: true }).fill(`${original} DISCARDED`);
  await page.getByTestId("cancel-edit").click();

  await expect(page.getByText(original, { exact: true })).toBeVisible();
  await expect(page.getByText(`${original} DISCARDED`)).toHaveCount(0);
});

test("an empty edit is rejected and the original text is retained", async ({
  page,
}) => {
  const original = `e2e invalid ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByTestId("loading")).toHaveCount(0);
  await page.getByLabel("New task").fill(original);
  await page.getByTestId("add-task").click();
  const row = page.locator("li", { hasText: original });
  await expect(row).toBeVisible();

  await row.getByTestId("edit").click();
  await page.getByLabel("Edit task", { exact: true }).fill("   ");
  await page.getByTestId("save").click();

  // Error shown; still in edit mode; cancel restores the original.
  await expect(page.getByTestId("edit-error")).toBeVisible();
  await page.getByTestId("cancel-edit").click();
  await expect(page.getByText(original, { exact: true })).toBeVisible();
});
