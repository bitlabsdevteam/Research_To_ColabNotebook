import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// Create a minimal valid PDF for testing
function createTestPdf(sizeBytes: number = 1024): string {
  const tmpPath = path.join(__dirname, `test-${sizeBytes}.pdf`);
  // Minimal valid PDF header
  const pdfHeader = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
  );
  // Pad to desired size
  const padding = Buffer.alloc(Math.max(0, sizeBytes - pdfHeader.length), 0);
  fs.writeFileSync(tmpPath, Buffer.concat([pdfHeader, padding]));
  return tmpPath;
}

function createTestTxt(): string {
  const tmpPath = path.join(__dirname, "test.txt");
  fs.writeFileSync(tmpPath, "not a pdf");
  return tmpPath;
}

test.describe("PDF Upload", () => {
  let smallPdfPath: string;
  let txtPath: string;

  test.beforeAll(() => {
    smallPdfPath = createTestPdf(1024);
    txtPath = createTestTxt();
  });

  test.afterAll(() => {
    [smallPdfPath, txtPath].forEach((p) => {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    });
  });

  test("shows dropzone on landing page", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({
      path: "tests/screenshots/task3-01-dropzone-visible.png",
    });

    const dropzone = page.getByTestId("pdf-dropzone");
    await expect(dropzone).toBeVisible();
  });

  test("accepts PDF file and shows file info", async ({ page }) => {
    await page.goto("/");

    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles(smallPdfPath);

    const fileName = page.getByTestId("pdf-file-name");
    await expect(fileName).toBeVisible();
    await expect(fileName).toContainText(".pdf");

    const fileSize = page.getByTestId("pdf-file-size");
    await expect(fileSize).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/task3-02-file-selected.png",
    });
  });

  test("rejects non-PDF files", async ({ page }) => {
    await page.goto("/");

    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles(txtPath);

    const error = page.getByTestId("pdf-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText(/pdf/i);

    await page.screenshot({
      path: "tests/screenshots/task3-03-rejected-file.png",
    });
  });

  test("generate button is disabled without API key and PDF", async ({
    page,
  }) => {
    await page.goto("/");

    const button = page.getByTestId("generate-button");
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();

    await page.screenshot({
      path: "tests/screenshots/task3-04-button-disabled.png",
    });
  });

  test("generate button is enabled when both API key and PDF are set", async ({
    page,
  }) => {
    await page.goto("/");

    // Set API key
    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("sk-test-key-12345");

    // Upload PDF
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles(smallPdfPath);

    const button = page.getByTestId("generate-button");
    await expect(button).toBeEnabled();

    await page.screenshot({
      path: "tests/screenshots/task3-05-button-enabled.png",
    });
  });
});
