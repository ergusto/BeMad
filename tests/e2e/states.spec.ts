import { test, expect } from "@playwright/test";

// FR-12 / AC #1–#2: distinct loading / empty / error states owned by the store.
// Uses network interception so the states are deterministic and DB-independent.

test("shows the loading state while todos are being fetched", async ({
  page,
}) => {
  await page.route("**/api/todos", async (route) => {
    if (route.request().method() === "GET") {
      // Delay so the loading state is observable before it resolves.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  await expect(page.getByText(/loading/i)).toBeVisible();
  // Then it resolves to the empty state.
  await expect(page.getByText("No tasks yet.")).toBeVisible();
});

test("shows the empty state when there are no todos", async ({ page }) => {
  await page.route("**/api/todos", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  await expect(page.getByText("No tasks yet.")).toBeVisible();
  await expect(page.locator("li")).toHaveCount(0);
});

test("shows a distinct error state on load failure, and Retry recovers", async ({
  page,
}) => {
  let failing = true;
  await page.route("**/api/todos", async (route) => {
    if (route.request().method() === "GET" && failing) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "INTERNAL", message: "Boom" } }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");

  // Distinct error state with the server message + a Retry control.
  await expect(page.getByText("Boom")).toBeVisible();
  const retry = page.getByRole("button", { name: "Retry", exact: true });
  await expect(retry).toBeVisible();

  // Stop failing, retry → the error clears and the app reaches a ready state
  // (the Add-task button is enabled only when status === "ready").
  failing = false;
  await retry.click();
  await expect(page.getByText("Boom")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /add task/i })).toBeEnabled();
});
