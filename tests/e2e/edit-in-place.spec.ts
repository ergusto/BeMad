import { test, expect } from "@playwright/test";

// FR-3 + persistence: create a task, edit its text inline, save, and confirm the
// edit survives a reload.
test("edit a task's text inline and it persists across reload", async ({
  page,
}) => {
  const original = `e2e edit ${Date.now()}`;
  const edited = `${original} EDITED`;

  await page.goto("/");
  await expect(page.getByTestId("loading")).toHaveCount(0);

  // Create.
  await page.getByLabel("New task").fill(original);
  await page.getByTestId("add-task").click();
  const row = page.locator("li", { hasText: original });
  await expect(row).toBeVisible();

  // Edit inline. Once editing, the row's span becomes an input, so the
  // hasText-scoped `row` locator no longer matches — use page-level locators
  // for the single active edit input / save button.
  await row.getByTestId("edit").click();
  await page.getByLabel("Edit task").fill(edited);
  await page.getByTestId("save").click();

  await expect(page.getByText(edited)).toBeVisible();

  // Persists across reload.
  await page.reload();
  await expect(page.getByTestId("loading")).toHaveCount(0);
  await expect(page.getByText(edited)).toBeVisible();
});
