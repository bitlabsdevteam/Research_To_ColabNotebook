import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

function createTestPdf(): string {
  const tmpPath = path.join(__dirname, "mode-selector-test.pdf");
  const pdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
  );
  fs.writeFileSync(tmpPath, pdfContent);
  return tmpPath;
}

test.describe("ModeSelector component", () => {
  let pdfPath: string;

  test.beforeAll(() => {
    pdfPath = createTestPdf();
  });

  test.afterAll(() => {
    if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  });

  test("mode selector renders with 'none' as default value", async ({ page }) => {
    await page.goto("/");

    const selector = page.getByTestId("mode-selector");
    await expect(selector).toBeVisible();
    await expect(selector).toHaveValue("none");

    await page.screenshot({
      path: "tests/screenshots/task5v6-01-mode-selector.png",
      fullPage: true,
    });
  });

  test("mode selector has 'none' and 'fairsteer' options", async ({ page }) => {
    await page.goto("/");

    const selector = page.getByTestId("mode-selector");
    await expect(selector.locator('option[value="none"]')).toHaveText(
      "None — general notebook"
    );
    await expect(selector.locator('option[value="fairsteer"]')).toHaveText(
      "FairSteer — bias detection"
    );
  });

  test("fairsteer banner is hidden when mode is 'none'", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("fairsteer-banner")).not.toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/task5v6-02-no-banner.png",
      fullPage: true,
    });
  });

  test("fairsteer banner appears when fairsteer option is selected", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("mode-selector").selectOption("fairsteer");

    const banner = page.getByTestId("fairsteer-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("FairSteer mode");
    await expect(banner).toContainText("BAD");
    await expect(banner).toContainText("DSV");
    await expect(banner).toContainText("DAS");

    await page.screenshot({
      path: "tests/screenshots/task5v6-03-fairsteer-banner.png",
      fullPage: true,
    });
  });

  test("fairsteer banner disappears when mode is switched back to none", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("mode-selector").selectOption("fairsteer");
    await expect(page.getByTestId("fairsteer-banner")).toBeVisible();

    await page.getByTestId("mode-selector").selectOption("none");
    await expect(page.getByTestId("fairsteer-banner")).not.toBeVisible();
  });

  test("mode selector renders between Upload PDF and Generate sections", async ({ page }) => {
    await page.goto("/");

    const formCard = page.getByTestId("form-card");
    const cardBox = await formCard.boundingBox();
    const selectorBox = await page.getByTestId("mode-selector").boundingBox();
    const generateBtn = page.getByTestId("generate-button");
    const generateBox = await generateBtn.boundingBox();

    // Mode selector should be inside the form card
    expect(selectorBox!.y).toBeGreaterThan(cardBox!.y);
    // Mode selector should appear above the generate button
    expect(selectorBox!.y).toBeLessThan(generateBox!.y);
  });

  test("mode is included in POST body when generating", async ({ page }) => {
    const fakeNotebook = {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {
        colab: { name: "Tutorial.ipynb", provenance: [] },
        kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
        language_info: { name: "python", version: "3.10.0" },
      },
      cells: [
        { cell_type: "markdown", metadata: {}, source: ["# Tutorial"] },
        { cell_type: "code", metadata: {}, source: ["print('hi')"], execution_count: null, outputs: [] },
      ],
    };

    let capturedFormData: Record<string, string> = {};

    await page.route("**/generate", async (route) => {
      const request = route.request();
      const postData = request.postData() || "";
      // Extract mode from multipart form data
      if (postData.includes('name="mode"')) {
        const match = postData.match(/name="mode"\r?\n\r?\n([^\r\n-]+)/);
        if (match) capturedFormData["mode"] = match[1].trim();
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fakeNotebook),
      });
    });

    await page.goto("/");

    // Select fairsteer mode
    await page.getByTestId("mode-selector").selectOption("fairsteer");

    // Fill form
    await page.getByTestId("api-key-input").fill("sk-test-key-12345");
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    // Intercept the network request to verify mode field
    const [request] = await Promise.all([
      page.waitForRequest("**/generate"),
      page.getByTestId("generate-button").click(),
    ]);

    const postData = request.postData() || "";
    expect(postData).toContain("fairsteer");

    await page.screenshot({
      path: "tests/screenshots/task5v6-04-generate-with-mode.png",
      fullPage: true,
    });
  });
});
