import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

function createTestPdf(): string {
  const tmpPath = path.join(__dirname, "full-flow-test.pdf");
  const pdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
  );
  fs.writeFileSync(tmpPath, pdfContent);
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
    {
      cell_type: "markdown",
      metadata: {},
      source: ["# Tutorial\n", "A generated notebook."],
    },
    {
      cell_type: "code",
      metadata: {},
      source: ["import numpy as np\n", "print('hello')"],
      execution_count: null,
      outputs: [],
    },
  ],
};

test.describe("Full User Flow", () => {
  let pdfPath: string;

  test.beforeAll(() => {
    pdfPath = createTestPdf();
  });

  test.afterAll(() => {
    if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  });

  test("complete flow: landing → API key → upload PDF → generate → download", async ({
    page,
  }) => {
    // Step 1: Navigate to home page
    await page.goto("/");
    await page.screenshot({
      path: "tests/screenshots/task4-01-landing-page.png",
    });

    // Verify key elements are visible
    await expect(page.getByTestId("app-title")).toBeVisible();
    await expect(page.getByTestId("app-title")).toContainText("Paper2Notebook");
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
    await expect(page.getByTestId("generate-button")).toBeDisabled();

    // Step 2: Enter API key
    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("sk-test-key-for-e2e-flow");
    await page.screenshot({
      path: "tests/screenshots/task4-02-api-key-entered.png",
    });

    // Button still disabled — no PDF yet
    await expect(page.getByTestId("generate-button")).toBeDisabled();

    // Step 3: Upload a test PDF
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles(pdfPath);
    await page.screenshot({
      path: "tests/screenshots/task4-03-pdf-uploaded.png",
    });

    // Verify file info is shown
    await expect(page.getByTestId("pdf-file-name")).toBeVisible();
    await expect(page.getByTestId("pdf-file-name")).toContainText(".pdf");

    // Button should now be enabled
    await expect(page.getByTestId("generate-button")).toBeEnabled();

    // Step 4: Mock the backend API and click Generate
    await page.route("**/generate", async (route) => {
      // Simulate a short delay
      await new Promise((r) => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fakeNotebook),
      });
    });

    await page.getByTestId("generate-button").click();

    // Screenshot showing loading state (must be fast — spinner may be brief)
    await page.screenshot({
      path: "tests/screenshots/task4-04-generating.png",
    });

    // Step 5: Wait for result panel to appear
    const resultPanel = page.getByTestId("result-panel");
    await expect(resultPanel).toBeVisible({ timeout: 10000 });
    await page.screenshot({
      path: "tests/screenshots/task4-05-result-ready.png",
    });

    // Verify download and Colab buttons
    await expect(page.getByTestId("download-button")).toBeVisible();
    await expect(page.getByTestId("open-colab-button")).toBeVisible();
  });

  test("shows error message when generation fails", async ({ page }) => {
    await page.goto("/");

    // Set API key and upload PDF
    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    // Mock backend to return error
    await page.route("**/generate", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Generation failed. Please try again." }),
      });
    });

    await page.getByTestId("generate-button").click();

    // Wait for error message
    const errorMsg = page.getByTestId("error-message");
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
    await expect(errorMsg).toContainText(/failed/i);

    await page.screenshot({
      path: "tests/screenshots/task4-06-error-displayed.png",
    });

    // Result panel should NOT be visible
    await expect(page.getByTestId("result-panel")).not.toBeVisible();
  });
});
