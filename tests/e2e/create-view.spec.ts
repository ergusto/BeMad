import { test, expect } from "@playwright/test";

// FR-1/FR-2 + persistence-durability: create a task, see it immediately, and
// confirm it survives a full page reload (durable server-side storage).
test("create a task, see it, and it persists across reload", async ({
  page,
}) => {
  const unique = `e2e task ${Date.now()}`;

  await page.goto("/");
  // Wait for the loading state to clear so the client component has hydrated
  // (and its onSubmit is attached) before we interact.
  await expect(page.getByText(/loading/i)).toHaveCount(0);
  await page.getByLabel("New task").fill(unique);
  await page.getByRole("button", { name: /add task/i }).click();

  await expect(page.getByText(unique)).toBeVisible();

  await page.reload();
  await expect(page.getByText(unique)).toBeVisible();
});
