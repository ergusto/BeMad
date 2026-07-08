import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Story 3.4 (FR-20 / NFR-4 / AD-10): the voiced UI stays accessible — stable
// accessible names as visible labels rotate, keyboard-operable, and an axe
// audit with zero critical violations at WCAG 2.2 AA.

const seeded = {
  id: "11111111-1111-4111-8111-111111111111",
  text: "seeded task",
  completed: false,
  createdAt: "2026-07-06T00:00:00.000Z",
};

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// The rotating-voice concept deliberately gives controls a stable aria-label that
// differs from the voiced visible text — a known WCAG 2.5.3 (Label in Name)
// trade-off (axe id "label-content-name-mismatch", impact "serious"). We gate on
// zero CRITICAL (the AC), and zero SERIOUS except that one documented rule.
async function assertNoBlockingViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  const seriousOther = results.violations.filter(
    (v) => v.impact === "serious" && v.id !== "label-content-name-mismatch",
  );
  expect(
    critical.map((v) => v.id),
    "critical a11y violations",
  ).toEqual([]);
  expect(
    seriousOther.map((v) => v.id),
    "serious a11y violations (excluding documented label-in-name trade-off)",
  ).toEqual([]);
}

async function routeGet(page: Page, body: unknown) {
  await page.route("**/api/todos", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    } else {
      await route.continue();
    }
  });
}

test("axe: empty state has no blocking violations", async ({ page }) => {
  await routeGet(page, []);
  await page.goto("/");
  await expect(page.getByTestId("empty-state")).toBeVisible();
  await assertNoBlockingViolations(page);
});

test("axe: list + open delete-confirm dialog have no blocking violations", async ({
  page,
}) => {
  await routeGet(page, [seeded]);
  await page.goto("/");
  await expect(page.getByTestId("sort")).toBeVisible();
  await assertNoBlockingViolations(page);

  // Open the confirm dialog and re-scan.
  await page.locator("li", { hasText: seeded.text }).getByTestId("delete").click();
  await expect(page.getByTestId("confirm-delete")).toBeVisible();
  await assertNoBlockingViolations(page);
});

test("axe: edit-in-place form open has no blocking violations", async ({
  page,
}) => {
  await routeGet(page, [seeded]);
  await page.goto("/");
  await page.locator("li", { hasText: seeded.text }).getByTestId("edit").click();
  await expect(page.getByTestId("save")).toBeVisible();
  await assertNoBlockingViolations(page);
});

test("axe: load-error state has no blocking violations", async ({ page }) => {
  await page.route("**/api/todos", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "INTERNAL", message: "boom" } }),
      });
    } else {
      await route.continue();
    }
  });
  await page.goto("/");
  await expect(page.getByTestId("load-error")).toBeVisible();
  await assertNoBlockingViolations(page);
});

test("accessible name is stable across a re-roll (visible label rotates)", async ({
  page,
}) => {
  await page.route("**/api/todos", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    } else if (req.method() === "POST") {
      const body = JSON.parse(req.postData() ?? "{}") as { text: string };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "22222222-2222-4222-8222-222222222222",
          text: body.text,
          completed: false,
          createdAt: "2026-07-07T00:00:00.000Z",
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  const add = page.getByTestId("add-task");
  const nameBefore = await add.getAttribute("aria-label");
  expect(nameBefore).toBe("Add task");

  // A successful add re-rolls the button's visible label.
  await page.getByLabel("New task").fill("stability task");
  await add.click();
  await expect(page.locator("li", { hasText: "stability task" })).toBeVisible();

  // Accessible name is unchanged even though the visible text may have rotated.
  expect(await add.getAttribute("aria-label")).toBe(nameBefore);
});

test("delete-confirm returns focus to the Delete trigger on cancel", async ({
  page,
}) => {
  await routeGet(page, [seeded]);
  await page.goto("/");
  const row = page.locator("li", { hasText: seeded.text });

  await row.getByTestId("delete").click();
  await expect(page.getByTestId("cancel-delete")).toBeFocused(); // autoFocus on open
  await page.getByTestId("cancel-delete").click();

  await expect(row.getByTestId("delete")).toBeFocused(); // focus returned
});

test("core flow is fully keyboard-operable", async ({ page }) => {
  const created = {
    id: "33333333-3333-4333-8333-333333333333",
    text: "kbd task",
    completed: false,
    createdAt: "2026-07-07T00:00:00.000Z",
  };
  await page.route("**/api/todos", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    } else if (req.method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
    } else {
      await route.continue();
    }
  });
  await page.route("**/api/todos/*", async (route) => {
    const method = route.request().method();
    if (method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...created, completed: true }),
      });
    } else if (method === "DELETE") {
      await route.fulfill({ status: 204, body: "" });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  await expect(page.getByTestId("empty-state")).toBeVisible();

  // Add via keyboard: focus input → type → Tab to Add → Enter.
  await page.getByLabel("New task").focus();
  await page.keyboard.type("kbd task");
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("add-task")).toBeFocused();
  await page.keyboard.press("Enter");

  const row = page.locator("li", { hasText: "kbd task" });
  await expect(row).toBeVisible();

  // Toggle via keyboard: focus the checkbox → Space.
  const checkbox = row.getByRole("checkbox");
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();

  // Delete via keyboard: focus Delete → Enter (opens confirm) → focus Confirm → Enter.
  await row.getByTestId("delete").focus();
  await page.keyboard.press("Enter");
  await page.getByTestId("confirm-delete").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("li", { hasText: "kbd task" })).toHaveCount(0);
});
