import { test, expect } from "@playwright/test";

const MOCK_NOTEBOOKS = [
  {
    id: "nb-001",
    title: "Attention Is All You Need",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    content: {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: { kernelspec: { name: "python3" } },
      cells: [],
    },
  },
  {
    id: "nb-002",
    title: "BERT Paper",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1d ago
    content: {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: { kernelspec: { name: "python3" } },
      cells: [],
    },
  },
];

async function injectMockUser(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("sign-in-button")).toBeVisible({ timeout: 5000 });
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("__supabase_mock_session", {
        detail: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: { avatar_url: "", full_name: "Test User" },
          },
        },
      })
    );
  });
}

async function injectMockNotebooks(
  page: import("@playwright/test").Page,
  notebooks = MOCK_NOTEBOOKS
) {
  await page.evaluate((nbs) => {
    (window as any).__supabase_mock_notebooks = nbs;
  }, notebooks);
}

test.describe("Notebooks Panel — Task 8", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();
  });

  test("task8-01: panel not visible when user is not signed in", async ({ page }) => {
    await page.screenshot({ path: "tests/screenshots/task8v5-01-no-panel-unauth.png" });
    await expect(page.getByTestId("notebooks-panel")).not.toBeVisible();
  });

  test("task8-02: panel appears after sign in with notebook rows", async ({ page }) => {
    await injectMockUser(page);
    await injectMockNotebooks(page);

    // Dispatch event to trigger panel refresh
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("__supabase_mock_notebooks_ready"))
    );

    await expect(page.getByTestId("notebooks-panel")).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "tests/screenshots/task8v5-02-panel-visible.png" });
  });

  test("task8-03: notebook rows rendered with title and download button", async ({ page }) => {
    await injectMockUser(page);
    await injectMockNotebooks(page);
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("__supabase_mock_notebooks_ready"))
    );

    await expect(page.getByTestId("notebooks-panel")).toBeVisible({ timeout: 5000 });

    const rows = page.getByTestId("notebook-row");
    await expect(rows).toHaveCount(2, { timeout: 5000 });

    // First row title visible
    await expect(rows.first()).toContainText("Attention Is All You Need");

    // Download buttons present
    await expect(page.getByTestId("notebook-download-nb-001")).toBeVisible();
    await expect(page.getByTestId("notebook-download-nb-002")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task8v5-03-rows-rendered.png" });
  });

  test("task8-04: empty state shown when no notebooks", async ({ page }) => {
    await injectMockUser(page);
    await injectMockNotebooks(page, []);
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("__supabase_mock_notebooks_ready"))
    );

    await expect(page.getByTestId("notebooks-panel")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("notebooks-empty-state")).toBeVisible({ timeout: 5000 });
    const emptyText = await page.getByTestId("notebooks-empty-state").textContent();
    expect(emptyText).toContain("No notebooks yet");

    await page.screenshot({ path: "tests/screenshots/task8v5-04-empty-state.png" });
  });

  test("task8-05: relative time shown in notebook rows", async ({ page }) => {
    await injectMockUser(page);
    await injectMockNotebooks(page);
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("__supabase_mock_notebooks_ready"))
    );

    await expect(page.getByTestId("notebooks-panel")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("notebook-row").first()).toContainText("ago", { timeout: 5000 });

    await page.screenshot({ path: "tests/screenshots/task8v5-05-relative-time.png" });
  });
});
