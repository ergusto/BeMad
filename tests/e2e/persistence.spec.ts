import { test, expect } from "@playwright/test";

// AD-13: server-side durability ACROSS A NEW SESSION (not just a reload). A task
// created/deleted in one browser context is reflected in a fresh, independent
// context (separate cookies/storage) — proving the data lives on the server.
// Real DB, no interception.
//
// These tests explicitly wait for the mutation's SERVER response (POST/DELETE)
// before opening the second session — the UI is optimistic, so asserting the
// on-screen row alone would only prove client state, not that the write
// committed. The second session also waits for its OWN GET so its assertion is
// never vacuous.

const isTodos = (method: string) => (r: { url(): string; request(): { method(): string } }) =>
  r.url().includes("/api/todos") && r.request().method() === method;

test("a task created in one session is visible in a brand-new session", async ({
  page,
  browser,
}) => {
  const unique = `e2e persistence ${Date.now()}-${Math.round(
    Math.random() * 1e6,
  )}`;

  // Session A: create + wait for the POST to commit server-side.
  await page.goto("/");
  await expect(page.getByTestId("loading")).toHaveCount(0);
  await page.getByLabel("New task").fill(unique);
  const [postResp] = await Promise.all([
    page.waitForResponse(isTodos("POST")),
    page.getByTestId("add-task").click(),
  ]);
  expect(postResp.ok()).toBe(true);
  await expect(page.locator("li", { hasText: unique })).toBeVisible();
  const url = page.url();

  // Session B: a brand-new, independent context. Wait for its own GET so the
  // assertion proves the server returned the task (not that B failed to load).
  const contextB = await browser.newContext();
  try {
    const b = await contextB.newPage();
    const [getResp] = await Promise.all([
      b.waitForResponse(isTodos("GET")),
      b.goto(url),
    ]);
    expect(getResp.ok()).toBe(true);
    await expect(b.locator("li", { hasText: unique })).toBeVisible();
  } finally {
    await contextB.close();
  }
});

test("a deletion is durable across a brand-new session", async ({
  page,
  browser,
}) => {
  const unique = `e2e delete-persist ${Date.now()}-${Math.round(
    Math.random() * 1e6,
  )}`;

  // Session A: create (wait for POST commit) then delete (wait for DELETE commit).
  await page.goto("/");
  await expect(page.getByTestId("loading")).toHaveCount(0);
  await page.getByLabel("New task").fill(unique);
  const [postResp] = await Promise.all([
    page.waitForResponse(isTodos("POST")),
    page.getByTestId("add-task").click(),
  ]);
  expect(postResp.ok()).toBe(true);

  const row = page.locator("li", { hasText: unique });
  await expect(row).toBeVisible();
  await row.getByTestId("delete").click();
  const [delResp] = await Promise.all([
    page.waitForResponse(isTodos("DELETE")),
    row.getByTestId("confirm-delete").click(),
  ]);
  expect(delResp.ok()).toBe(true);
  await expect(page.locator("li", { hasText: unique })).toHaveCount(0);
  const url = page.url();

  // Session B: fresh context must NOT see the deleted task (after its GET lands).
  const contextB = await browser.newContext();
  try {
    const b = await contextB.newPage();
    const [getResp] = await Promise.all([
      b.waitForResponse(isTodos("GET")),
      b.goto(url),
    ]);
    expect(getResp.ok()).toBe(true);
    await expect(b.locator("li", { hasText: unique })).toHaveCount(0);
  } finally {
    await contextB.close();
  }
});
