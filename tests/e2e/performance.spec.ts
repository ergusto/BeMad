import { test, expect } from "@playwright/test";

// NFR-1: optimistic UI reflects every action in ≤100 ms; server reconciliation
// ≤500 ms (p95) under normal conditions. Real DB, no interception.
//
// Optimistic latency is measured ENTIRELY IN-PAGE (a capture-phase click stamp +
// a MutationObserver for the pending row's paint) so Playwright's ~100 ms locator
// polling granularity never contaminates the number. Reconciliation is the
// wall-clock from the add-click to the POST response committing, sampled and
// reduced to p95.

const isTodosPost = (r: { url(): string; request(): { method(): string } }) =>
  r.url().includes("/api/todos") && r.request().method() === "POST";

const p95 = (samples: number[]): number => {
  if (samples.length === 0) return NaN;
  const sorted = [...samples].sort((a, b) => a - b);
  // Nearest-rank p95.
  const rank = Math.ceil(0.95 * sorted.length);
  return sorted[Math.min(rank, sorted.length) - 1] ?? NaN;
};

// Perf timing is meaningful on one project; the mobile project only adds
// emulation noise. Skip by PROJECT name — both projects use the chromium engine
// (Desktop Chrome + Pixel 7), so keying on browserName would never skip.
test.describe("performance (NFR-1)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "runs on the chromium project only",
    );
  });

  test("optimistic UI reflects an add in ≤100 ms", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("loading")).toHaveCount(0);

    const text = `perf-optimistic ${Date.now()}`;
    await page.getByLabel("New task").fill(text);

    // Arm in-page instrumentation BEFORE the click: a capture-phase listener on
    // the add button stamps the click instant; a MutationObserver stamps when the
    // pending row (<li data-pending="true">) first paints.
    await page.evaluate(() => {
      const w = window as unknown as { __perf?: { clickAt?: number; paintAt?: number } };
      w.__perf = {};
      const btn = document.querySelector('[data-testid="add-task"]');
      btn?.addEventListener(
        "click",
        () => {
          w.__perf!.clickAt = performance.now();
        },
        { capture: true, once: true },
      );
      const obs = new MutationObserver(() => {
        if (w.__perf!.clickAt !== undefined && w.__perf!.paintAt === undefined) {
          if (document.querySelector('li[data-pending="true"]')) {
            w.__perf!.paintAt = performance.now();
            obs.disconnect();
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });

    await page.getByTestId("add-task").click();
    // The pending row is transient (reconciliation is <100 ms), so Playwright's
    // polling could miss it — but the in-page observer captured its paint
    // synchronously. Wait on that marker, not a polled locator.
    await page.waitForFunction(
      () =>
        (window as unknown as { __perf?: { paintAt?: number } }).__perf?.paintAt !==
        undefined,
      null,
      { timeout: 5000 },
    );

    const optimisticMs = await page.evaluate(() => {
      const w = window as unknown as { __perf?: { clickAt?: number; paintAt?: number } };
      return (w.__perf?.paintAt ?? NaN) - (w.__perf?.clickAt ?? NaN);
    });

    expect(optimisticMs).toBeGreaterThanOrEqual(0);
    expect(optimisticMs, `optimistic latency ${optimisticMs.toFixed(1)}ms`).toBeLessThanOrEqual(100);
    test.info().annotations.push({
      type: "perf:optimistic-ms",
      description: optimisticMs.toFixed(1),
    });
  });

  test("server reconciliation p95 ≤500 ms", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("loading")).toHaveCount(0);

    // Discard warmup creates (route compile / connection-pool spin-up), then
    // measure enough samples that p95 (nearest-rank) genuinely drops the top
    // tail rather than being the single worst sample.
    const WARMUP = 5;
    const SAMPLES = 40;
    const durations: number[] = [];
    for (let i = 0; i < WARMUP + SAMPLES; i++) {
      await page.getByLabel("New task").fill(`perf-reconcile ${Date.now()}-${i}`);
      // Wall-clock from the add-click to the POST committing. This is a
      // CONSERVATIVE upper bound — it includes a little Playwright click/CDP
      // overhead — so a pass means the true server round-trip is even faster.
      const t0 = performance.now();
      const [resp] = await Promise.all([
        page.waitForResponse(isTodosPost),
        page.getByTestId("add-task").click(),
      ]);
      const dt = performance.now() - t0;
      expect(resp.ok()).toBe(true);
      if (i >= WARMUP) durations.push(dt);
      // Let the commit settle so the next iteration starts from a clean input.
      await expect(page.locator('li[data-pending="true"]')).toHaveCount(0);
    }

    const measured = p95(durations);
    test.info().annotations.push({
      type: "perf:reconcile-p95-ms",
      description: `${measured.toFixed(1)} (n=${durations.length}, warmup=${WARMUP}, max=${Math.max(...durations).toFixed(1)})`,
    });
    expect(
      measured,
      `reconcile p95 ${measured.toFixed(1)}ms over ${durations.length} samples`,
    ).toBeLessThanOrEqual(500);
  });
});
