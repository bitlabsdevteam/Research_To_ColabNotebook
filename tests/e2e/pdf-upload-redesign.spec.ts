import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

function createTestPdf(): string {
  const tmpPath = path.join(__dirname, "pdf-redesign-test.pdf");
  fs.writeFileSync(
    tmpPath,
    Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
    )
  );
  return tmpPath;
}

test.describe("PdfUpload Redesign — Task 5", () => {
  let pdfPath: string;

  test.beforeAll(() => {
    pdfPath = createTestPdf();
  });

  test.afterAll(() => {
    if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  });

  test("cloud-upload icon is visible in empty dropzone", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({ path: "tests/screenshots/task5-01-dropzone-empty.png" });

    const uploadIcon = page.getByTestId("pdf-upload-icon");
    await expect(uploadIcon).toBeVisible();
  });

  test("dropzone shows helper text in empty state", async ({ page }) => {
    await page.goto("/");

    const helperText = page.getByTestId("pdf-upload-helper");
    await expect(helperText).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task5-02-dropzone-helper-text.png" });
  });

  test("file-selected state shows document icon and file pill", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);
    await page.screenshot({ path: "tests/screenshots/task5-03-file-selected.png" });

    // Document icon should appear
    const docIcon = page.getByTestId("pdf-file-icon");
    await expect(docIcon).toBeVisible();

    // File name and size still present (existing testids)
    await expect(page.getByTestId("pdf-file-name")).toBeVisible();
    await expect(page.getByTestId("pdf-file-size")).toBeVisible();
  });

  test("file-selected state hides the upload icon", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    const uploadIcon = page.getByTestId("pdf-upload-icon");
    await expect(uploadIcon).not.toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task5-04-upload-icon-hidden.png" });
  });

  test("error state shows red pill with shake animation class", async ({ page }) => {
    await page.goto("/");

    // Upload a non-PDF to trigger error
    const txtPath = path.join(__dirname, "not-a-pdf.txt");
    fs.writeFileSync(txtPath, "not a pdf");

    try {
      await page.getByTestId("pdf-file-input").setInputFiles(txtPath);
      await page.screenshot({ path: "tests/screenshots/task5-05-error-state.png" });

      const errorEl = page.getByTestId("pdf-error");
      await expect(errorEl).toBeVisible();

      // Error element should have the shake animation class
      const hasShake = await page.evaluate(() => {
        const el = document.querySelector("[data-testid='pdf-error']");
        return el?.classList.contains("animate-shake") ?? false;
      });
      expect(hasShake).toBe(true);
    } finally {
      fs.unlinkSync(txtPath);
    }
  });

  test("all original pdf-upload data-testids are preserved", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
    await expect(page.getByTestId("pdf-file-input")).toBeAttached();

    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);
    await expect(page.getByTestId("pdf-file-name")).toBeVisible();
    await expect(page.getByTestId("pdf-file-size")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task5-06-original-testids.png" });
  });
});
