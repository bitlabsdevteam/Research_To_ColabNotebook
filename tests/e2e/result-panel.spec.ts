import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// Create a minimal test PDF
function createTestPdf(): string {
  const tmpPath = path.join(__dirname, "test-result.pdf");
  const pdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
  );
  fs.writeFileSync(tmpPath, pdfContent);
  return tmpPath;
}

const mockNotebookResponse = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    colab: { name: "Paper2Notebook_Tutorial.ipynb", provenance: [] },
    kernelspec: {
      display_name: "Python 3",
      language: "python",
      name: "python3",
    },
  },
  cells: [
    {
      cell_type: "markdown",
      metadata: {},
      source: ["# Tutorial\n", "This is a test notebook."],
    },
    {
      cell_type: "code",
      metadata: {},
      source: ["print('hello')"],
      execution_count: null,
      outputs: [],
    },
  ],
};

test.describe("Result Panel", () => {
  let pdfPath: string;

  test.beforeAll(() => {
    pdfPath = createTestPdf();
  });

  test.afterAll(() => {
    if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  });

  test("shows loading state during generation", async ({ page }) => {
    // Intercept API call and delay response
    await page.route("**/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockNotebookResponse),
      });
    });

    await page.goto("/");

    // Fill API key and upload PDF
    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    // Click generate
    await page.getByTestId("generate-button").click();

    // Should show loading state
    const loading = page.getByTestId("loading-indicator");
    await expect(loading).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/task10-01-loading-state.png",
    });

    // Wait for result
    await expect(page.getByTestId("result-panel")).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows download and open-in-colab buttons after generation", async ({
    page,
  }) => {
    // Intercept API call with immediate response
    await page.route("**/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockNotebookResponse),
      });
    });

    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);
    await page.getByTestId("generate-button").click();

    // Wait for result panel
    await expect(page.getByTestId("result-panel")).toBeVisible({
      timeout: 10000,
    });

    // Check download button
    const downloadBtn = page.getByTestId("download-button");
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toContainText(/download/i);

    // Check open in colab button
    const colabBtn = page.getByTestId("open-colab-button");
    await expect(colabBtn).toBeVisible();
    await expect(colabBtn).toContainText(/colab/i);

    await page.screenshot({
      path: "tests/screenshots/task10-02-result-buttons.png",
    });
  });

  test("shows error message on API failure", async ({ page }) => {
    // Intercept API call with error response
    await page.route("**/generate", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Internal server error" }),
      });
    });

    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);
    await page.getByTestId("generate-button").click();

    // Should show error
    const error = page.getByTestId("error-message");
    await expect(error).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: "tests/screenshots/task10-03-error-state.png",
    });
  });
});
