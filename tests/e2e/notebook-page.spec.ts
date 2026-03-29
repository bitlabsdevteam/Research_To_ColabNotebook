import { test, expect } from "@playwright/test";

const MOCK_ID = "test-notebook-id-abc";

const MOCK_NOTEBOOK_DATA = {
  id: MOCK_ID,
  title: "Attention Is All You Need",
  created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  content: {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: { kernelspec: { name: "python3" } },
    cells: [
      {
        cell_type: "markdown",
        source: "# Introduction\nThis paper introduces the Transformer.",
        metadata: {},
        outputs: [],
      },
      {
        cell_type: "code",
        source: 'import torch\nprint("Hello, Transformer!")',
        metadata: {},
        outputs: [],
      },
    ],
  },
};

test.describe("Notebook Public Page — Task 9", () => {
  test("task9-01: visiting /notebook/[id] renders notebook-preview container", async ({ page }) => {
    // Inject mock before navigation
    await page.addInitScript((nb) => {
      (window as any).__supabase_mock_notebook = nb;
    }, MOCK_NOTEBOOK_DATA);

    await page.goto(`/notebook/${MOCK_ID}`);
    await page.screenshot({ path: "tests/screenshots/task9v5-01-notebook-preview.png" });

    await expect(page.getByTestId("notebook-preview")).toBeVisible({ timeout: 5000 });
  });

  test("task9-02: notebook title is shown", async ({ page }) => {
    await page.addInitScript((nb) => {
      (window as any).__supabase_mock_notebook = nb;
    }, MOCK_NOTEBOOK_DATA);

    await page.goto(`/notebook/${MOCK_ID}`);
    await expect(page.getByTestId("notebook-preview")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("h1, h2")).toContainText("Attention Is All You Need");

    await page.screenshot({ path: "tests/screenshots/task9v5-02-notebook-title.png" });
  });

  test("task9-03: markdown cells rendered as divs", async ({ page }) => {
    await page.addInitScript((nb) => {
      (window as any).__supabase_mock_notebook = nb;
    }, MOCK_NOTEBOOK_DATA);

    await page.goto(`/notebook/${MOCK_ID}`);
    await expect(page.getByTestId("notebook-preview")).toBeVisible({ timeout: 5000 });

    const markdownCell = page.getByTestId("cell-markdown").first();
    await expect(markdownCell).toBeVisible();
    await expect(markdownCell).toContainText("Introduction");

    await page.screenshot({ path: "tests/screenshots/task9v5-03-markdown-cell.png" });
  });

  test("task9-04: code cells rendered in pre/code blocks", async ({ page }) => {
    await page.addInitScript((nb) => {
      (window as any).__supabase_mock_notebook = nb;
    }, MOCK_NOTEBOOK_DATA);

    await page.goto(`/notebook/${MOCK_ID}`);
    await expect(page.getByTestId("notebook-preview")).toBeVisible({ timeout: 5000 });

    const codeCell = page.getByTestId("cell-code").first();
    await expect(codeCell).toBeVisible();
    await expect(codeCell).toContainText("import torch");

    await page.screenshot({ path: "tests/screenshots/task9v5-04-code-cell.png" });
  });

  test("task9-05: 404 state shown when notebook not found", async ({ page }) => {
    // No mock notebook set — will show not found
    await page.goto("/notebook/nonexistent-id-xyz");
    await page.screenshot({ path: "tests/screenshots/task9v5-05-not-found.png" });

    await expect(page.getByTestId("notebook-not-found")).toBeVisible({ timeout: 5000 });
  });

  test("task9-06: download and open-in-colab buttons present", async ({ page }) => {
    await page.addInitScript((nb) => {
      (window as any).__supabase_mock_notebook = nb;
    }, MOCK_NOTEBOOK_DATA);

    await page.goto(`/notebook/${MOCK_ID}`);
    await expect(page.getByTestId("notebook-preview")).toBeVisible({ timeout: 5000 });

    await expect(page.getByTestId("download-button")).toBeVisible();
    await expect(page.getByTestId("open-colab-button")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task9v5-06-action-buttons.png" });
  });
});
