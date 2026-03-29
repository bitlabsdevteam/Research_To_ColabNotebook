import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

function createTestPdf(): string {
  const tmpPath = path.join(__dirname, "loading-test.pdf");
  fs.writeFileSync(
    tmpPath,
    Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
    )
  );
  return tmpPath;
}

test.describe("Loading & Error State Redesign — Task 7", () => {
  let pdfPath: string;

  test.beforeAll(() => {
    pdfPath = createTestPdf();
  });

  test.afterAll(() => {
    if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  });

  test("loading indicator has three dot elements", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    // Intercept the generate request with a long delay so we can screenshot loading
    await page.route("**/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.getByTestId("generate-button").click();

    // Capture the loading state
    const loadingIndicator = page.getByTestId("loading-indicator");
    await expect(loadingIndicator).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: "tests/screenshots/task7-01-loading-state.png" });

    // Should have three dot elements
    const dots = page.getByTestId("loading-dot");
    await expect(dots).toHaveCount(3);
  });

  test("loading indicator contains generating label text", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    await page.route("**/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.getByTestId("generate-button").click();

    const loadingIndicator = page.getByTestId("loading-indicator");
    await expect(loadingIndicator).toBeVisible({ timeout: 3000 });

    const label = page.getByTestId("loading-label");
    await expect(label).toBeVisible();
    await expect(label).toContainText(/generating/i);

    await page.screenshot({ path: "tests/screenshots/task7-02-loading-label.png" });
  });

  test("each loading dot has bounceDot animation", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    await page.route("**/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.getByTestId("generate-button").click();

    await page.getByTestId("loading-indicator").waitFor({ state: "visible", timeout: 3000 });

    // Each dot should have bounceDot animation applied
    const dotsHaveAnimation = await page.evaluate(() => {
      const dots = document.querySelectorAll("[data-testid='loading-dot']");
      return Array.from(dots).every((dot) => {
        const style = getComputedStyle(dot);
        return style.animationName.includes("bounceDot");
      });
    });
    expect(dotsHaveAnimation).toBe(true);

    await page.screenshot({ path: "tests/screenshots/task7-03-dots-animation.png" });
  });

  test("error message is a pill badge (not plain text)", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    await page.route("**/generate", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Generation failed. Please try again." }),
      });
    });

    await page.getByTestId("generate-button").click();

    const errorEl = page.getByTestId("error-message");
    await expect(errorEl).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: "tests/screenshots/task7-04-error-pill.png" });

    // Error element should have a border-radius indicating pill/badge styling
    const borderRadius = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='error-message']") as HTMLElement;
      return getComputedStyle(el).borderRadius;
    });
    // Should not be 0px (plain text has no border-radius)
    expect(borderRadius).not.toBe("0px");
  });

  test("error message has animate-shake class", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    await page.route("**/generate", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Generation failed. Please try again." }),
      });
    });

    await page.getByTestId("generate-button").click();

    await page.getByTestId("error-message").waitFor({ state: "visible", timeout: 5000 });

    const hasShake = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='error-message']");
      return el?.classList.contains("animate-shake") ?? false;
    });
    expect(hasShake).toBe(true);

    await page.screenshot({ path: "tests/screenshots/task7-05-error-shake.png" });
  });

  test("loading-indicator data-testid is preserved", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("api-key-input").fill("sk-test-key");
    await page.getByTestId("pdf-file-input").setInputFiles(pdfPath);

    await page.route("**/generate", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.getByTestId("generate-button").click();

    await expect(page.getByTestId("loading-indicator")).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: "tests/screenshots/task7-06-loading-testid.png" });
  });
});
