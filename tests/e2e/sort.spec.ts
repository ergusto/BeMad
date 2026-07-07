import { test, expect, type Page } from "@playwright/test";

// AC #1–#2 (FR-8): switching the sort option reorders the visible list. Seeded
// via GET interception so it's deterministic and DB-independent.

// Deliberately NOT in createdAt order and NOT matching any single sort result,
// so each assertion below distinguishes a real sort from rendering canonical order.
// banana=Jan/active, cherry=Mar/active, apple=Feb/completed.
const seeded = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    text: "banana",
    completed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    text: "cherry",
    completed: false,
    createdAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    text: "apple",
    completed: true,
    createdAt: "2026-02-01T00:00:00.000Z",
  },
];

const WORDS = ["apple", "banana", "cherry"];

async function visibleOrder(page: Page): Promise<string[]> {
  const rows = await page.locator("ul li").allInnerTexts();
  return rows
    .map((row) => WORDS.find((w) => row.includes(w)))
    .filter((w): w is string => Boolean(w));
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/todos", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(seeded),
      });
    } else {
      await route.continue();
    }
  });
});

test("defaults to newest-first", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Sort tasks")).toHaveValue("newest");
  // createdAt desc: cherry (Mar), apple (Feb), banana (Jan).
  expect(await visibleOrder(page)).toEqual(["cherry", "apple", "banana"]);
});

test("switching to oldest-first reorders the list", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Sort tasks").selectOption("oldest");
  await expect(page.getByLabel("Sort tasks")).toHaveValue("oldest");
  expect(await visibleOrder(page)).toEqual(["banana", "apple", "cherry"]);
});

test("switching to alphabetical reorders the list", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Sort tasks").selectOption("alphabetical");
  expect(await visibleOrder(page)).toEqual(["apple", "banana", "cherry"]);
});

test("switching to active-first groups active tasks before completed", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Sort tasks").selectOption("active-first");
  // active (newest-first): cherry (Mar), banana (Jan); then completed: apple.
  expect(await visibleOrder(page)).toEqual(["cherry", "banana", "apple"]);
});

test("a new task is sorted by the active order (newest → top), not just appended", async ({
  page,
}) => {
  // Own handler so it covers GET + a held POST (overrides beforeEach's GET).
  let releasePost: () => void = () => {};
  const postHeld = new Promise<void>((resolve) => {
    releasePost = resolve;
  });
  await page.route("**/api/todos", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(seeded),
      });
    } else if (req.method() === "POST") {
      const body = JSON.parse(req.postData() ?? "{}") as { text: string };
      await postHeld;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "99999999-9999-4999-8999-999999999999",
          text: body.text,
          completed: false,
          createdAt: "2026-12-01T00:00:00.000Z", // newest of all
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  // Default newest. Canonical order appends a create LAST, but the newest sort
  // must place it FIRST — both as the optimistic pending row and after commit.
  await page.getByLabel("New task").fill("zeta task");
  await page.getByRole("button", { name: /add task/i }).click();

  const items = page.locator("ul li");
  await expect(items.first()).toContainText("zeta task"); // pending, sorted to top

  releasePost();
  await expect(items.first()).toContainText("zeta task"); // committed, still top
});
