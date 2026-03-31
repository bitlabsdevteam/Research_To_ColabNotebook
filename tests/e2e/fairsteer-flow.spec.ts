import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

function createTestPdf(): string {
  const tmpPath = path.join(__dirname, "fairsteer-flow-test.pdf");
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
      source: ["# FairSteer Bias Detection Tutorial\n", "Implementing BAD, DSV, and DAS."],
    },
    {
      cell_type: "code",
      metadata: {},
      source: ["!pip install transformers datasets numpy scikit-learn matplotlib"],
      execution_count: null,
      outputs: [],
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: ["## BAD: Biased Activation Detection\n", "Train logistic regression on layer activations."],
    },
    {
      cell_type: "code",
      metadata: {},
      source: [
        "# logistic regression on layer activations\n",
        "from sklearn.linear_model import LogisticRegression\n",
        "clf = LogisticRegression()\n",
        "clf.fit(X_train, y_train)",
      ],
      execution_count: null,
      outputs: [],
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: ["## DSV: Debiasing Steering Vector\n", "Compute mean difference between activation clusters."],
    },
    {
      cell_type: "code",
      metadata: {},
      source: [
        "# Compute DSV as mean activation difference\n",
        "dsv = np.mean(activations_biased - activations_unbiased, axis=0)  # DSV vector",
      ],
      execution_count: null,
      outputs: [],
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: ["## DAS: Dynamic Activation Steering"],
    },
    {
      cell_type: "code",
      metadata: {},
      source: ["# Apply DAS when bias detected\n", "a_adj = a_l + dsv if prob < 0.5 else a_l"],
      execution_count: null,
      outputs: [],
    },
    {
      cell_type: "markdown",
      metadata: {},
      source: ["## Visualization"],
    },
    {
      cell_type: "code",
      metadata: {},
      source: ["import matplotlib.pyplot as plt\n", "plt.plot(accuracies)\n", "plt.show()"],
      execution_count: null,
      outputs: [],
    },
  ],
};

test.describe("FairSteer flow", () => {
  let pdfPath: string;

  test.beforeAll(() => {
    pdfPath = createTestPdf();
  });

  test.afterAll(() => {
    if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  });

  test("FairSteer mode generates notebook — result-panel renders", async ({ page }) => {
    await page.route("**/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fairSteerNotebook),
      });
    });

    await page.goto("/");
    await page.screenshot({ path: "tests/screenshots/task7v6-01-fairsteer-start.png", fullPage: true });

    // Select FairSteer mode
    await page.getByTestId("mode-selector").selectOption("fairsteer");
    await expect(page.getByTestId("fairsteer-banner")).toBeVisible();

    // Fill in API key
    await page.getByTestId("api-key-input").fill("sk-test-key-12345");

    // Upload PDF
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    // Click generate
    await page.getByTestId("generate-button").click();

    // Result panel should appear
    await page.waitForSelector('[data-testid="result-panel"]', { timeout: 10000 });
    await expect(page.getByTestId("result-panel")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task7v6-01-fairsteer-result.png", fullPage: true });
  });

  test("FairSteer mode sends mode=fairsteer in request body", async ({ page }) => {
    let capturedMode: string | null = null;

    await page.route("**/generate", async (route) => {
      const postData = route.request().postData() || "";
      if (postData.includes("fairsteer")) {
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
  });

  test("none mode sends mode=none in request body", async ({ page }) => {
    await page.route("**/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fairSteerNotebook),
      });
    });

    await page.goto("/");

    // Leave mode as default "none"
    await page.getByTestId("api-key-input").fill("sk-test-key-12345");
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    const [request] = await Promise.all([
      page.waitForRequest("**/generate"),
      page.getByTestId("generate-button").click(),
    ]);

    const postData = request.postData() || "";
    expect(postData).toContain("none");

    await page.screenshot({ path: "tests/screenshots/task7v6-02-none-mode.png", fullPage: true });
  });
});
