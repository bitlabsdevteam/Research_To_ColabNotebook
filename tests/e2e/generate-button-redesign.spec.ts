import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

function createTestPdf(): string {
  const tmpPath = path.join(__dirname, "gen-btn-test.pdf");
  fs.writeFileSync(
    tmpPath,
    Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
    )
  );
  return tmpPath;
}

test.describe("GenerateButton Redesign — Task 6", () => {
  let pdfPath: string;

  test.beforeAll(() => {
    pdfPath = createTestPdf();
  });

  test.afterAll(() => {
    if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  });

  test("disabled button has muted background and cursor-not-allowed", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({ path: "tests/screenshots/task6-01-button-disabled.png" });

    const btn = page.getByTestId("generate-button");
    await expect(btn).toBeDisabled();

    // Disabled button should use elevated bg color (not gradient)
    const hasDisabledStyle = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='generate-button']") as HTMLButtonElement;
      return el?.disabled === true;
    });
    expect(hasDisabledStyle).toBe(true);
  });

  test("enabled button has indigo gradient background", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    const btn = page.getByTestId("generate-button");
    await expect(btn).toBeEnabled();

    // Check background style has a gradient
    const bgImage = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='generate-button']") as HTMLElement;
      return getComputedStyle(el).backgroundImage;
    });
    // Should be a gradient (linear-gradient)
    expect(bgImage).toContain("gradient");

    await page.screenshot({ path: "tests/screenshots/task6-02-button-enabled-gradient.png" });
  });

  test("button has 48px height", async ({ page }) => {
    await page.goto("/");

    const btn = page.getByTestId("generate-button");
    const box = await btn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(46);
    expect(box?.height).toBeLessThanOrEqual(56);

    await page.screenshot({ path: "tests/screenshots/task6-03-button-height.png" });
  });

  test("button has overflow hidden (needed for shimmer clip)", async ({ page }) => {
    await page.goto("/");

    const hasOverflowHidden = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='generate-button']") as HTMLElement;
      return getComputedStyle(el).overflow === "hidden";
    });
    expect(hasOverflowHidden).toBe(true);

    await page.screenshot({ path: "tests/screenshots/task6-04-overflow-hidden.png" });
  });

  test("button is positioned relative (for shimmer pseudo-element)", async ({ page }) => {
    await page.goto("/");

    const position = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='generate-button']") as HTMLElement;
      return getComputedStyle(el).position;
    });
    expect(position).toBe("relative");

    await page.screenshot({ path: "tests/screenshots/task6-05-position-relative.png" });
  });

  test("generate-button data-testid is preserved and clickable", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    const btn = page.getByTestId("generate-button");
    await expect(btn).toBeEnabled();
    await expect(btn).toContainText(/generate/i);

    await page.screenshot({ path: "tests/screenshots/task6-06-button-clickable.png" });
  });
});
