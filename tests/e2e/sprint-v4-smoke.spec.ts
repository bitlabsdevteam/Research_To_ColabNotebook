/**
 * Sprint v4 smoke test — Task 10
 * Runs the complete user flow against the redesigned UI, capturing task10-* screenshots.
 * Verifies all data-testid selectors that existed before v4 still work unchanged.
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

function createTestPdf(): string {
  const tmpPath = path.join(__dirname, "smoke-v4.pdf");
  fs.writeFileSync(
    tmpPath,
    Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
    )
  );
  return tmpPath;
}

const fakeNotebook = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    colab: { name: "Paper2Notebook_Tutorial.ipynb", provenance: [] },
    kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
    language_info: { name: "python", version: "3.10.0" },
  },
  cells: [
    { cell_type: "markdown", metadata: {}, source: ["# Tutorial\n", "A generated notebook."] },
    { cell_type: "code", metadata: {}, source: ["import numpy as np\n", "print('hello')"], execution_count: null, outputs: [] },
  ],
};

test.describe("Sprint v4 Smoke — Full Redesigned Flow", () => {
  let pdfPath: string;

  test.beforeAll(() => { pdfPath = createTestPdf(); });
  test.afterAll(() => { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); });

  test("task10-01: landing page renders full redesigned UI", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({ path: "tests/screenshots/task10-01-landing-redesigned.png" });

    // Header present
    await expect(page.getByTestId("site-header")).toBeVisible();
    await expect(page.getByTestId("header-brand-title")).toContainText("Paper2Notebook");

    // Hero block
    await expect(page.getByTestId("app-title")).toBeVisible();
    await expect(page.getByTestId("hero-heading")).toBeVisible();
    await expect(page.getByTestId("app-description")).toBeVisible();

    // Form card with step labels
    await expect(page.getByTestId("form-card")).toBeVisible();
    await expect(page.getByTestId("step-label-1")).toBeVisible();
    await expect(page.getByTestId("step-label-2")).toBeVisible();
    await expect(page.getByTestId("step-label-3")).toBeVisible();

    // Generate button disabled (no key + no PDF)
    await expect(page.getByTestId("generate-button")).toBeDisabled();

    // Footer present
    await expect(page.getByTestId("site-footer")).toBeVisible();
  });

  test("task10-02: entering API key shows lock icon and filled indicator", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("api-key-lock-icon")).toBeVisible();
    await expect(page.getByTestId("api-key-eye-toggle")).toBeVisible();

    await page.getByTestId("api-key-input").fill("sk-test-v4-smoke");
    await expect(page.getByTestId("api-key-indicator")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task10-02-api-key-filled.png" });
  });

  test("task10-03: uploading PDF shows document icon and file pill", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    await expect(page.getByTestId("pdf-upload-icon")).not.toBeVisible();
    await expect(page.getByTestId("pdf-file-icon")).toBeVisible();
    await expect(page.getByTestId("pdf-file-name")).toBeVisible();
    await expect(page.getByTestId("pdf-file-size")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task10-03-pdf-uploaded.png" });
  });

  test("task10-04: generate button enables when both inputs are filled", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-v4");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    await expect(page.getByTestId("generate-button")).toBeEnabled();

    // Gradient background is applied
    const bgImage = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='generate-button']") as HTMLElement;
      return getComputedStyle(el).backgroundImage;
    });
    expect(bgImage).toContain("gradient");

    await page.screenshot({ path: "tests/screenshots/task10-04-button-enabled.png" });
  });

  test("task10-05: loading state shows three bouncing dots", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("api-key-input").fill("sk-test-v4");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    await page.route("**/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fakeNotebook) });
    });

    await page.getByTestId("generate-button").click();

    const loading = page.getByTestId("loading-indicator");
    await expect(loading).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("loading-dot")).toHaveCount(3);
    await expect(page.getByTestId("loading-label")).toContainText(/generating/i);

    await page.screenshot({ path: "tests/screenshots/task10-05-loading-dots.png" });
  });

  test("task10-06: result panel slides in with success state", async ({ page }) => {
    await page.route("**/generate", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fakeNotebook) });
    });

    await page.goto("/");
    await page.getByTestId("api-key-input").fill("sk-test-v4");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);
    await page.getByTestId("generate-button").click();

    const resultPanel = page.getByTestId("result-panel");
    await expect(resultPanel).toBeVisible({ timeout: 8000 });

    await expect(page.getByTestId("result-check-icon")).toBeVisible();
    await expect(page.getByTestId("result-heading")).toContainText(/notebook ready/i);
    await expect(page.getByTestId("download-button")).toBeVisible();
    await expect(page.getByTestId("open-colab-button")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task10-06-result-ready.png" });
  });

  test("task10-07: error state shows red pill badge with shake", async ({ page }) => {
    await page.route("**/generate", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Generation failed. Please try again." }),
      });
    });

    await page.goto("/");
    await page.getByTestId("api-key-input").fill("sk-test-v4");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);
    await page.getByTestId("generate-button").click();

    const errorMsg = page.getByTestId("error-message");
    await expect(errorMsg).toBeVisible({ timeout: 8000 });
    await expect(errorMsg).toContainText(/failed/i);

    const hasShake = await page.evaluate(() =>
      document.querySelector("[data-testid='error-message']")?.classList.contains("animate-shake") ?? false
    );
    expect(hasShake).toBe(true);

    await expect(page.getByTestId("result-panel")).not.toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task10-07-error-pill.png" });
  });
});
