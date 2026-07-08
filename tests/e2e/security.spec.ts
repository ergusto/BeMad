import { test, expect } from "@playwright/test";

// AD-11: task text is rendered XSS-safe. There is no dangerouslySetInnerHTML in
// the app; all user text goes through React's auto-escaping. These tests prove a
// script-injection payload renders as INERT TEXT — it is neither executed nor
// turned into a real element — and that a real-DB round-trip doesn't reintroduce
// a vector. Real DB, no interception.

const isTodos = (method: string) => (r: { url(): string; request(): { method(): string } }) =>
  r.url().includes("/api/todos") && r.request().method() === method;

const PAYLOADS = [
  // Classic <script> injection.
  `<script>window.__xss = true</script>`,
  // Attribute/handler injection via an image error handler.
  `<img src=x onerror="window.__xss = true">`,
];

for (const payload of PAYLOADS) {
  test(`task text is inert: ${payload.slice(0, 24)}…`, async ({ page, browser }) => {
    // Positive baseline: the payloads would flip this to `true` IF they executed.
    // Asserting `toBe(false)` (not `toBeUndefined`) also catches a broken harness
    // where the init script never ran. The primary XSS guards, however, are the
    // literal-text and no-injected-element assertions below.
    await page.addInitScript(() => {
      (window as unknown as { __xss?: boolean }).__xss = false;
    });

    const unique = `${payload} [${Date.now()}-${Math.round(Math.random() * 1e6)}]`;

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

    // 1) The literal payload is shown as TEXT (React escaped it).
    await expect(row.locator(".todo-text")).toHaveText(unique);
    // 2) No real element was injected from the payload.
    await expect(row.locator("script, img")).toHaveCount(0);
    // 3) The payload never executed (corroborating; #1/#2 are the real guards).
    expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBe(false);

    // 4) A brand-new session (real DB round-trip) still renders it inert.
    const url = page.url();
    const contextB = await browser.newContext();
    try {
      const b = await contextB.newPage();
      await b.addInitScript(() => {
        (window as unknown as { __xss?: boolean }).__xss = false;
      });
      const [getResp] = await Promise.all([
        b.waitForResponse(isTodos("GET")),
        b.goto(url),
      ]);
      expect(getResp.ok()).toBe(true);
      const rowB = b.locator("li", { hasText: unique });
      await expect(rowB.locator(".todo-text")).toHaveText(unique);
      await expect(rowB.locator("script, img")).toHaveCount(0);
      expect(await b.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBe(false);
    } finally {
      await contextB.close();
    }
  });
}
