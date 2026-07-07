import { test, expect } from "@playwright/test";

// AC #1–#3 / FR-10–FR-11: optimistic create/toggle/delete with rollback on
// failure. Fully network-intercepted so each path is deterministic and needs no
// database (mirrors states.spec).

const seeded = {
  id: "11111111-1111-4111-8111-111111111111",
  text: "seeded task",
  completed: false,
  createdAt: "2026-07-06T00:00:00.000Z",
};

test("create shows the task optimistically, then reconciles with the server", async ({
  page,
}) => {
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
        body: "[]",
      });
    } else if (req.method() === "POST") {
      await postHeld; // hold the server so the pending state is observable
      const body = JSON.parse(req.postData() ?? "{}") as { text: string };
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "22222222-2222-4222-8222-222222222222",
          text: body.text,
          completed: false,
          createdAt: "2026-07-06T00:00:00.000Z",
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  await expect(page.getByText("No tasks yet.")).toBeVisible();

  await page.getByLabel("New task").fill("optimistic task");
  await page.getByRole("button", { name: /add task/i }).click();

  // Appears immediately (before the POST resolves) as a non-mutable pending row.
  const row = page.locator("li", { hasText: "optimistic task" });
  await expect(row).toBeVisible();
  await expect(row.getByText("Saving…")).toBeVisible();
  await expect(row.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);

  // Release the server → reconciles into a saved row with controls.
  releasePost();
  await expect(row.getByText("Saving…")).toHaveCount(0);
  await expect(row.getByRole("button", { name: "Edit", exact: true })).toBeVisible();
});

test("create rollback removes the task, shows an error, and keeps the typed text", async ({
  page,
}) => {
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
          error: { code: "INTERNAL", message: "Create failed" },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  await expect(page.getByText("No tasks yet.")).toBeVisible();

  await page.getByLabel("New task").fill("doomed task");
  await page.getByRole("button", { name: /add task/i }).click();

  // Rollback: the optimistic row is gone, the error banner is shown...
  await expect(page.getByText("Create failed")).toBeVisible();
  await expect(page.locator("li", { hasText: "doomed task" })).toHaveCount(0);
  // ...and the typed text is retained so the user can retry (FR-10).
  await expect(page.getByLabel("New task")).toHaveValue("doomed task");
});

test("toggle applies optimistically, then rolls back on failure", async ({
  page,
}) => {
  let releasePatch: () => void = () => {};
  const patchHeld = new Promise<void>((resolve) => {
    releasePatch = resolve;
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
  await page.route("**/api/todos/*", async (route) => {
    if (route.request().method() === "PATCH") {
      await patchHeld; // hold so the optimistic flip is observable
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL", message: "Toggle failed" },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  const checkbox = page.getByRole("checkbox", {
    name: `Completed: ${seeded.text}`,
  });
  await expect(checkbox).not.toBeChecked();

  await checkbox.click();
  // Optimistic: flips to checked immediately, before the server responds.
  await expect(checkbox).toBeChecked();

  // Release the (failing) server → snaps back to unchecked + error banner.
  releasePatch();
  await expect(page.getByText("Toggle failed")).toBeVisible();
  await expect(checkbox).not.toBeChecked();
});

test("edit rollback restores the prior text but keeps the typed draft to retry", async ({
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
  await page.route("**/api/todos/*", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL", message: "Edit failed" },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  await page
    .locator("li", { hasText: seeded.text })
    .getByRole("button", { name: "Edit", exact: true })
    .click();

  const editInput = page.getByLabel("Edit task");
  await editInput.fill("edited attempt");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Rollback: prior text restored in the store; error banner shown; the editor
  // stays open with the typed draft so the user can retry (FR-10).
  await expect(page.getByText("Edit failed")).toBeVisible();
  await expect(editInput).toBeVisible();
  await expect(editInput).toHaveValue("edited attempt");

  // Cancel returns the row to its prior, unmodified text.
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("li", { hasText: seeded.text })).toBeVisible();
});

test("delete removes optimistically, then reinserts the task on failure", async ({
  page,
}) => {
  let releaseDelete: () => void = () => {};
  const deleteHeld = new Promise<void>((resolve) => {
    releaseDelete = resolve;
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
  await page.route("**/api/todos/*", async (route) => {
    if (route.request().method() === "DELETE") {
      await deleteHeld; // hold so the optimistic removal is observable
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL", message: "Delete failed" },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  const row = page.locator("li", { hasText: seeded.text });
  await expect(row).toBeVisible();

  await row
    .getByRole("button", { name: `Delete: ${seeded.text}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: `Confirm delete: ${seeded.text}`, exact: true })
    .click();

  // Optimistic: the row is gone immediately, before the server responds.
  await expect(page.locator("li", { hasText: seeded.text })).toHaveCount(0);

  // Release the (failing) server → the row reappears + error banner.
  releaseDelete();
  await expect(page.getByText("Delete failed")).toBeVisible();
  await expect(page.locator("li", { hasText: seeded.text })).toBeVisible();
});

test("edit is applied optimistically before the server confirms", async ({
  page,
}) => {
  let releasePatch: () => void = () => {};
  const patchHeld = new Promise<void>((resolve) => {
    releasePatch = resolve;
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
  await page.route("**/api/todos/*", async (route) => {
    const req = route.request();
    if (req.method() === "PATCH") {
      const body = JSON.parse(req.postData() ?? "{}") as { text?: string };
      await patchHeld; // hold so the optimistic edit is observable pre-commit
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...seeded, text: body.text ?? seeded.text }),
      });
    } else {
      await route.continue();
    }
  });

  await page.goto("/");
  await page
    .locator("li", { hasText: seeded.text })
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page.getByLabel("Edit task").fill("renamed task");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Optimistic: editor closes and the list shows the new text while PATCH held.
  await expect(page.getByLabel("Edit task")).toHaveCount(0);
  await expect(page.locator("li", { hasText: "renamed task" })).toBeVisible();

  // Release the server → the reconciled text stays.
  releasePatch();
  await expect(page.locator("li", { hasText: "renamed task" })).toBeVisible();
});
