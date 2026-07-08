import { test, expect } from "@playwright/test";
import { VOICE_CATALOG, FIXED_COPY } from "../../lib/voice/catalog";

// Story 3.3: the app speaks in the voice pack. Verifies the provider mounts
// without a hydration mismatch, controls show voiced (catalog) copy, and error
// paths show a voiced (not raw server) message (AD-8). Deterministic via
// GET/POST interception.

const seeded = {
  id: "11111111-1111-4111-8111-111111111111",
  text: "seeded task",
  completed: false,
  createdAt: "2026-07-06T00:00:00.000Z",
};

test("mounts the voice provider with no hydration mismatch", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.route("**/api/todos", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([seeded]),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  // Wait for the ready render (post-hydration rotation has run).
  await expect(page.getByTestId("sort")).toBeVisible();
  await expect(page.getByTestId("add-task")).toBeVisible();

  expect(
    consoleErrors.filter((e) => /hydrat/i.test(e)),
    consoleErrors.join("\n"),
  ).toEqual([]);
});

test("controls show voiced copy from the pack (not hardcoded)", async ({
  page,
}) => {
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
  const addText = (await page.getByTestId("add-task").textContent())?.trim();
  expect(VOICE_CATALOG.addButton as readonly string[]).toContain(addText);

  const emptyText = (await page.getByTestId("empty-state").textContent())?.trim();
  expect(VOICE_CATALOG.emptyState as readonly string[]).toContain(emptyText);
});

test("sort options use fixed voiced copy (non-rotating, FR-17)", async ({
  page,
}) => {
  await page.route("**/api/todos", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([seeded]),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  const options = await page
    .getByTestId("sort")
    .locator("option")
    .allInnerTexts();
  // Order matches SORT_OPTIONS: newest, oldest, alphabetical, active-first.
  expect(options.map((t) => t.trim())).toEqual([
    FIXED_COPY.newest,
    FIXED_COPY.oldest,
    FIXED_COPY.alphabetical,
    FIXED_COPY["active-first"],
  ]);
});

test("ALL-CAPS is CSS-only, and the quiet-aside beat is exempt (FR-20)", async ({
  page,
}) => {
  await page.route("**/api/todos", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([seeded]),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  // A normal voiced control is uppercased via CSS...
  const editTransform = await page
    .getByTestId("edit")
    .evaluate((el) => getComputedStyle(el).textTransform);
  expect(editTransform).toBe("uppercase");

  // ...but the delete-cancel "quiet aside" is exempt (stays lowercase).
  await page.locator("li", { hasText: seeded.text }).getByTestId("delete").click();
  const cancelTransform = await page
    .getByTestId("cancel-delete")
    .evaluate((el) => getComputedStyle(el).textTransform);
  expect(cancelTransform).toBe("none");
});

test("error path shows a voiced (not raw) message", async ({ page }) => {
  await page.route("**/api/todos", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    } else if (req.method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL", message: "Raw server boom" },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  await page.getByLabel("New task").fill("doomed");
  await page.getByTestId("add-task").click();

  const banner = page.getByTestId("mutation-error");
  await expect(banner).toBeVisible();
  await expect(banner).not.toContainText("Raw server boom"); // AD-8: never the raw message
  // INTERNAL → genericError (client mapping); the shown copy is a genericError variant.
  const msg = (await banner.locator("p").textContent())?.trim();
  expect(VOICE_CATALOG.genericError as readonly string[]).toContain(msg);
});
