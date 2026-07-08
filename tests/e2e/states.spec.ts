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
  await expect(page.getByTestId("loading")).toBeVisible();
  // Then it resolves to the empty state.
  await expect(page.getByTestId("empty-state")).toBeVisible();
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
  await expect(page.getByTestId("empty-state")).toBeVisible();
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

  // Distinct error state: the surface is shown with VOICED copy (not the raw
  // server "Boom" message — AD-8), plus a Retry control.
  const loadError = page.getByTestId("load-error");
  await expect(loadError).toBeVisible();
  await expect(loadError).not.toContainText("Boom"); // raw server message never shown
  const retry = page.getByTestId("retry");
  await expect(retry).toBeVisible();

  // Stop failing, retry → the error clears and the app reaches a ready state
  // (the Add-task button is enabled only when status === "ready").
  failing = false;
  await retry.click();
  await expect(page.getByTestId("load-error")).toHaveCount(0);
  await expect(page.getByTestId("add-task")).toBeEnabled();
});
