/**
 * Sprint v6 — Smoke Test Suite
 *
 * Covers the four acceptance criteria:
 * (a) Mode selector renders with "None" default
 * (b) Switching to FairSteer shows info banner
 * (c) FairSteer mode sends correct mode field in request (network intercept)
 * (d) Mocked FairSteer notebook renders in ResultPanel with save-indicator
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

function createTestPdf(): string {
  const tmpPath = path.join(__dirname, "sprint-v6-smoke-test.pdf");
  const pdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
  );
  fs.writeFileSync(tmpPath, pdfContent);
  return tmpPath;
}

const fairSteerNotebook = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    colab: { name: "FairSteer_Tutorial.ipynb", provenance: [] },
    kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
    language_info: { name: "python", version: "3.10.0" },
  },
  cells: [
    {
      cell_type: "markdown",
      metadata: {},
      source: ["# FairSteer Bias Detection Tutorial"],
    },
    {
      cell_type: "code",
      metadata: {},
      source: ["!pip install transformers datasets numpy scikit-learn matplotlib"],
      execution_count: null,
      outputs: [],
    },
    {
      cell_type: "code",
      metadata: {},
      source: ["# logistic regression on layer activations\nfrom sklearn.linear_model import LogisticRegression"],
      execution_count: null,
      outputs: [],
    },
    {
      cell_type: "code",
      metadata: {},
      source: ["# DSV computation\ndsv = np.mean(activations_biased - activations_unbiased, axis=0)"],
      execution_count: null,
      outputs: [],
    },
  ],
};

test.describe("Sprint v6 smoke tests", () => {
  let pdfPath: string;

  test.beforeAll(() => {
    pdfPath = createTestPdf();
  });

  test.afterAll(() => {
    if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  });

  test("(a) mode selector renders with 'None' as default", async ({ page }) => {
    await page.goto("/");

    const selector = page.getByTestId("mode-selector");
    await expect(selector).toBeVisible();
    await expect(selector).toHaveValue("none");

    await page.screenshot({
      path: "tests/screenshots/task10v6-01-mode-selector-default.png",
      fullPage: true,
    });
  });

  test("(b) switching to FairSteer shows info banner", async ({ page }) => {
    await page.goto("/");

    // Banner should not be visible at default (none)
    await expect(page.getByTestId("fairsteer-banner")).not.toBeVisible();

    // Select fairsteer mode
    await page.getByTestId("mode-selector").selectOption("fairsteer");

    // Banner should now be visible with correct content
    const banner = page.getByTestId("fairsteer-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("FairSteer mode");
    await expect(banner).toContainText("BAD");
    await expect(banner).toContainText("DSV");
    await expect(banner).toContainText("DAS");

    await page.screenshot({
      path: "tests/screenshots/task10v6-02-fairsteer-banner.png",
      fullPage: true,
    });
  });

  test("(c) FairSteer mode sends correct mode field in request", async ({ page }) => {
    let capturedMode: string | null = null;

    await page.route("**/generate", async (route) => {
      const postData = route.request().postData() || "";
      // Extract mode value from multipart form data
      const modeMatch = postData.match(/name="mode"\r?\n\r?\n([^\r\n-]+)/);
      if (modeMatch) {
        capturedMode = modeMatch[1].trim();
      } else if (postData.includes("fairsteer")) {
        capturedMode = "fairsteer";
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fairSteerNotebook),
      });
    });

    await page.goto("/");
    await page.getByTestId("mode-selector").selectOption("fairsteer");
    await page.getByTestId("api-key-input").fill("sk-test-key-12345");
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    const [request] = await Promise.all([
      page.waitForRequest("**/generate"),
      page.getByTestId("generate-button").click(),
    ]);

    const postData = request.postData() || "";
    expect(postData).toContain("fairsteer");

    await page.screenshot({
      path: "tests/screenshots/task10v6-03-fairsteer-request.png",
      fullPage: true,
    });
  });

  test("(d) mocked FairSteer notebook renders in ResultPanel with save-indicator", async ({ page }) => {
    const mockShareId = "smoke-test-share-id-v6";

    await page.route("**/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fairSteerNotebook),
      });
    });

    // Inject mock supabase save ID so save-indicator renders
    await page.goto("/");
    await page.evaluate((shareId) => {
      (window as any).__supabase_mock_save_id = shareId;
    }, mockShareId);

    // Select FairSteer mode and fill form
    await page.getByTestId("mode-selector").selectOption("fairsteer");
    await page.getByTestId("api-key-input").fill("sk-test-key-12345");
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    await page.getByTestId("generate-button").click();

    // Result panel should render
    await page.waitForSelector('[data-testid="result-panel"]', { timeout: 10000 });
    await expect(page.getByTestId("result-panel")).toBeVisible();
    await expect(page.getByTestId("result-heading")).toContainText("Notebook ready");
    await expect(page.getByTestId("download-button")).toBeVisible();
    await expect(page.getByTestId("open-colab-button")).toBeVisible();

    // Save indicator should render (injected mock shareId triggers it)
    await expect(page.getByTestId("save-indicator")).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/task10v6-04-result-panel-with-save.png",
      fullPage: true,
    });
  });
});
