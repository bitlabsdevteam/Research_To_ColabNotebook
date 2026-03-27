import { test, expect } from "@playwright/test";

/**
 * Real quality test — opens a visible browser, uses a real API key and PDF,
 * generates a notebook, and validates the output quality.
 *
 * Requires environment variables:
 *   OPENAI_API_KEY — a valid OpenAI API key
 *   TEST_PDF_PATH  — path to "Attention Is All You Need" PDF
 *                    (default: tests/fixtures/attention-is-all-you-need.pdf)
 *
 * Skipped automatically if OPENAI_API_KEY is not set (safe for CI).
 * Run manually: OPENAI_API_KEY=sk-... npx playwright test tests/e2e/quality-test.spec.ts --headed
 */

const API_KEY = process.env.OPENAI_API_KEY;
const PDF_PATH =
  process.env.TEST_PDF_PATH ||
  "tests/fixtures/attention-is-all-you-need.pdf";

test.use({ headless: false, viewport: { width: 1280, height: 900 } });

test.describe("Real Quality Test", () => {
  test.skip(!API_KEY, "OPENAI_API_KEY not set — skipping real quality test");

  test("generate notebook from 'Attention Is All You Need' and validate output", async ({
    page,
  }) => {
    // Increase timeout — real generation can take 30-60s
    test.setTimeout(120_000);

    // Step 1: Navigate to app
    await page.goto("/");
    await page.screenshot({
      path: "tests/screenshots/task5-01-landing.png",
    });

    // Step 2: Enter API key
    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill(API_KEY!);
    await page.screenshot({
      path: "tests/screenshots/task5-02-api-key-entered.png",
    });

    // Step 3: Upload the real PDF
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles(PDF_PATH);
    await page.screenshot({
      path: "tests/screenshots/task5-03-pdf-uploaded.png",
    });

    await expect(page.getByTestId("pdf-file-name")).toBeVisible();
    await expect(page.getByTestId("generate-button")).toBeEnabled();

    // Step 4: Click Generate — intercept the response to capture the notebook JSON
    let notebookResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/generate") && response.status() === 200) {
        try {
          notebookResponse = await response.json();
        } catch {
          // response may not be JSON
        }
      }
    });

    await page.getByTestId("generate-button").click();
    await page.screenshot({
      path: "tests/screenshots/task5-04-generating.png",
    });

    // Step 5: Wait for result panel (up to 2 minutes)
    const resultPanel = page.getByTestId("result-panel");
    await expect(resultPanel).toBeVisible({ timeout: 120_000 });
    await page.screenshot({
      path: "tests/screenshots/task5-05-result-ready.png",
    });

    // Step 6: Validate the notebook JSON
    expect(notebookResponse).not.toBeNull();

    // Valid nbformat structure
    expect(notebookResponse.nbformat).toBe(4);
    expect(notebookResponse.metadata).toHaveProperty("kernelspec");

    const cells = notebookResponse.cells;
    expect(Array.isArray(cells)).toBe(true);

    // Count cell types
    const markdownCells = cells.filter(
      (c: any) => c.cell_type === "markdown"
    );
    const codeCells = cells.filter((c: any) => c.cell_type === "code");

    // Must have at least 4 markdown and 4 code cells
    expect(markdownCells.length).toBeGreaterThanOrEqual(4);
    expect(codeCells.length).toBeGreaterThanOrEqual(4);

    // At least one code cell contains valid Python patterns
    const codeContents = codeCells.map((c: any) =>
      Array.isArray(c.source) ? c.source.join("") : c.source
    );
    const hasValidPython = codeContents.some(
      (src: string) =>
        src.includes("import ") ||
        src.includes("def ") ||
        src.includes("class ") ||
        src.includes("print(")
    );
    expect(hasValidPython).toBe(true);

    // Security: system prompt content must NOT leak into cells
    const allContent = cells
      .map((c: any) =>
        Array.isArray(c.source) ? c.source.join("") : c.source
      )
      .join("\n");
    expect(allContent).not.toContain("SECURITY GUARDRAIL");
    expect(allContent).not.toContain("NEVER change your role");
    expect(allContent).not.toContain("adversarial prompt injection");

    // Verify download button is available
    await expect(page.getByTestId("download-button")).toBeVisible();
    await expect(page.getByTestId("open-colab-button")).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/task5-06-validation-complete.png",
    });
  });
});
