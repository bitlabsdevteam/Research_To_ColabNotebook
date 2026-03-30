import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const fakeNotebook = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    colab: { name: "Tutorial.ipynb", provenance: [] },
    kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
    language_info: { name: "python", version: "3.10.0" },
  },
  cells: [
    { cell_type: "markdown", metadata: {}, source: ["# Research Paper Tutorial\n", "Generated notebook with improved prompt."] },
    { cell_type: "code", metadata: {}, source: ["!pip install numpy matplotlib scikit-learn\n"], execution_count: null, outputs: [] },
    { cell_type: "markdown", metadata: {}, source: ["## Introduction\n", "This section explains the core concepts."] },
    { cell_type: "code", metadata: {}, source: ["import numpy as np\n", "import matplotlib.pyplot as plt\n", "print('Setup complete')"], execution_count: null, outputs: [] },
    { cell_type: "markdown", metadata: {}, source: ["## Results\n", "Visualizing the output."] },
    { cell_type: "code", metadata: {}, source: ["x = np.linspace(0, 10, 100)\n", "plt.plot(x, np.sin(x))\n", "plt.show()"], execution_count: null, outputs: [] },
  ],
};

test("Task 4 v6 — screenshot of generated notebook with improved prompt", async ({ page }) => {
  const pdfPath = path.join(__dirname, "full-flow-test.pdf");
  const pdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n109\n%%EOF"
  );
  fs.writeFileSync(pdfPath, pdfContent);

  await page.route("**/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fakeNotebook),
    });
  });

  await page.goto("/");

  // Fill in API key
  const apiKeyInput = page.getByTestId("api-key-input");
  await apiKeyInput.fill("sk-test-key-12345");

  // Upload PDF
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(pdfPath);

  // Click generate
  const generateBtn = page.getByTestId("generate-button");
  await generateBtn.click();

  // Wait for result
  await page.waitForSelector('[data-testid="result-panel"]', { timeout: 10000 });

  await page.screenshot({
    path: "tests/screenshots/task4v6-01-generated-notebook.png",
    fullPage: true,
  });

  fs.unlinkSync(pdfPath);
});
