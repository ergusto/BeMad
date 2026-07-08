import { test, expect, type Page } from "@playwright/test";

// AC #1–#2 (FR-13/NFR-5): the layout adapts to phone + desktop viewports with no
// horizontal overflow, long unbroken text wraps, and controls stay usable.
// Seeded via GET interception so it's deterministic and DB-independent.

const longText = "L".repeat(120); // unbroken, no spaces — stresses wrapping

const seeded = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    text: "short task",
    completed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    text: longText,
    completed: false,
    createdAt: "2026-02-01T00:00:00.000Z",
  },
];

const viewports = [
  { name: "small-mobile", width: 320, height: 568 }, // narrowest realistic phone
  { name: "mobile", width: 360, height: 740 },
  { name: "desktop", width: 1280, height: 800 },
];

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

// Whole-UI overflow check: assert on <main> (the app container), NOT the
// document element — `html, body { overflow-x: hidden }` would clamp the
// document's scrollWidth and mask real overflow. <main> is not overflow-clipped,
// so if any child (form, sort control, a row) overflowed, its scrollWidth would
// exceed its clientWidth. This catches whole-UI overflow, not just one row.
async function mainHasNoHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return false;
    return main.scrollWidth <= main.clientWidth + 1;
  });
}

for (const vp of viewports) {
  test(`no horizontal overflow at ${vp.name} (${vp.width}px), long text wraps`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");

    // The long-unbroken-text row must wrap WITHIN itself. The <li> has no
    // overflow clipping (unlike body), so if the text failed to wrap its
    // scrollWidth would exceed its clientWidth. This is the real wrapping test.
    const longRow = page.locator("li", { hasText: longText });
    await expect(longRow).toBeVisible();
    const rowOverflow = await longRow.evaluate(
      (el) => el.scrollWidth - el.clientWidth,
    );
    expect(rowOverflow).toBeLessThanOrEqual(1);

    // And the app container itself has no horizontal overflow.
    expect(await mainHasNoHorizontalOverflow(page)).toBe(true);
  });
}

test("controls remain visible and usable at a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");

  await expect(page.getByLabel("New task")).toBeVisible();
  await expect(page.getByRole("button", { name: /add task/i })).toBeVisible();
  await expect(page.getByLabel("Sort tasks")).toBeVisible();

  const row = page.locator("li", { hasText: "short task" });
  await expect(row.getByRole("checkbox")).toBeVisible();
  await expect(row.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
  await expect(
    row.getByRole("button", { name: "Delete: short task", exact: true }),
  ).toBeVisible();

  // A control is actually operable (not just visible) at this width.
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Edit task")).toBeVisible();
});
