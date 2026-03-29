/**
 * Sprint v5 Smoke Tests
 *
 * (a) Light theme toggle flip
 * (b) Dark mode preserved by default
 * (c) save-indicator after mocked generation + mocked Supabase insert
 * (d) NotebooksPanel renders mocked notebook rows
 * (e) /notebook/[id] renders mocked notebook cells
 */
import { test, expect } from "@playwright/test";

const MOCK_NOTEBOOK = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { name: "python3" } },
  cells: [
    { cell_type: "markdown", source: "# Smoke Test Notebook", metadata: {}, outputs: [] },
    { cell_type: "code", source: "print('hello')", metadata: {}, outputs: [] },
  ],
};

const MOCK_NOTEBOOKS_LIST = [
  {
    id: "smoke-nb-001",
    title: "Smoke Test Paper",
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    content: MOCK_NOTEBOOK,
  },
];

const SHARE_ID = "smoke-share-id-999";

async function injectMockUser(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("sign-in-button")).toBeVisible({ timeout: 5000 });
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("__supabase_mock_session", {
        detail: {
          user: {
            id: "smoke-user-123",
            email: "smoke@example.com",
            user_metadata: { avatar_url: "", full_name: "Smoke User" },
          },
        },
      })
    );
  });
}

// ─── (a) Light theme toggle flip ────────────────────────────────────────────

test("task10v5-01: light theme toggle flips dark → light", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("theme"));
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.screenshot({ path: "tests/screenshots/task10v5-01-light-toggle.png" });
});

// ─── (b) Dark mode preserved by default ─────────────────────────────────────

test("task10v5-02: dark mode is default on fresh load", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("theme"));
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.screenshot({ path: "tests/screenshots/task10v5-02-dark-default.png" });
});

// ─── (c) save-indicator after generation + Supabase insert mock ─────────────

test("task10v5-03: save-indicator visible after mocked generation and save", async ({ page }) => {
  await page.route("**/generate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_NOTEBOOK),
    })
  );

  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("theme"));
  await page.reload();

  await injectMockUser(page);
  await page.evaluate((id) => {
    (window as any).__supabase_mock_save_id = id;
  }, SHARE_ID);

  // Fill API key
  await page.locator('input[type="password"], input[type="text"]').first().fill("sk-smoke-key");

  // Upload dummy PDF
  await page.locator('input[type="file"]').setInputFiles({
    name: "smoke-paper.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 smoke"),
  });

  await page.getByTestId("generate-button").click();

  await expect(page.getByTestId("result-panel")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("save-indicator")).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: "tests/screenshots/task10v5-03-save-indicator.png" });
});

// ─── (d) NotebooksPanel renders mocked rows ──────────────────────────────────

test("task10v5-04: NotebooksPanel renders mocked notebook rows", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("theme"));
  await page.reload();

  await injectMockUser(page);
  await page.evaluate((nbs) => {
    (window as any).__supabase_mock_notebooks = nbs;
  }, MOCK_NOTEBOOKS_LIST);
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent("__supabase_mock_notebooks_ready"))
  );

  await expect(page.getByTestId("notebooks-panel")).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId("notebook-row")).toHaveCount(1, { timeout: 5000 });
  await expect(page.getByTestId("notebook-row").first()).toContainText("Smoke Test Paper");

  await page.screenshot({ path: "tests/screenshots/task10v5-04-notebooks-panel.png" });
});

// ─── (e) /notebook/[id] renders mocked cells ────────────────────────────────

test("task10v5-05: /notebook/[id] renders mocked notebook cells", async ({ page }) => {
  const mockNotebookRecord = {
    id: "smoke-nb-id",
    title: "Smoke Test Notebook",
    created_at: new Date().toISOString(),
    content: MOCK_NOTEBOOK,
  };

  await page.addInitScript((nb) => {
    (window as any).__supabase_mock_notebook = nb;
  }, mockNotebookRecord);

  await page.goto("/notebook/smoke-nb-id");

  await expect(page.getByTestId("notebook-preview")).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId("cell-markdown").first()).toContainText("Smoke Test Notebook");
  await expect(page.getByTestId("cell-code").first()).toContainText("print");

  await page.screenshot({ path: "tests/screenshots/task10v5-05-notebook-page.png" });
});
