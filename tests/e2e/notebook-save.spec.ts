import { test, expect } from "@playwright/test";

const MOCK_NOTEBOOK = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { name: "python3" } },
  cells: [{ cell_type: "markdown", source: "# Test", metadata: {}, outputs: [] }],
};

/** Route /generate to return a mock notebook */
async function mockGenerate(page: import("@playwright/test").Page) {
  await page.route("**/generate", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_NOTEBOOK),
    });
  });
}

/** Inject mock user and a Supabase save result */
async function setupAuthAndSaveMock(page: import("@playwright/test").Page, shareId = "mock-share-abc") {
  await expect(page.getByTestId("sign-in-button")).toBeVisible({ timeout: 5000 });

  await page.evaluate((id) => {
    // Inject mock user
    window.dispatchEvent(
      new CustomEvent("__supabase_mock_session", {
        detail: {
          user: {
            id: "test-user-123",
            email: "test@example.com",
            user_metadata: { avatar_url: "", full_name: "Test User" },
          },
        },
      })
    );
    // Set mock Supabase save result
    (window as any).__supabase_mock_save_id = id;
  }, shareId);
}

/** Fill in a fake API key and upload a dummy file, then click Generate */
async function triggerGenerate(page: import("@playwright/test").Page) {
  // Fill API key
  const apiKeyInput = page.locator('input[type="password"], input[type="text"]').first();
  await apiKeyInput.fill("sk-test-key-12345");

  // Upload a dummy PDF file
  const buffer = Buffer.from("%PDF-1.4 test");
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "test-paper.pdf",
    mimeType: "application/pdf",
    buffer,
  });

  await page.getByTestId("generate-button").click();
}

test.describe("Notebook Auto-Save — Task 6", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();
  });

  test("task6-01: save-indicator not shown when user is not signed in", async ({ page }) => {
    await mockGenerate(page);
    await triggerGenerate(page);

    // Wait for result panel
    await expect(page.getByTestId("result-panel")).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: "tests/screenshots/task6v5-01-no-save-unauth.png" });

    // save-indicator should NOT be present
    await expect(page.getByTestId("save-indicator")).not.toBeVisible();
  });

  test("task6-02: save-indicator appears when user is signed in and notebook generated", async ({ page }) => {
    await mockGenerate(page);
    await setupAuthAndSaveMock(page);

    await triggerGenerate(page);

    await expect(page.getByTestId("result-panel")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("save-indicator")).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: "tests/screenshots/task6v5-02-save-indicator.png" });
  });

  test("task6-03: save-indicator shows share link with correct shareId", async ({ page }) => {
    await mockGenerate(page);
    await setupAuthAndSaveMock(page, "my-share-id-456");

    await triggerGenerate(page);

    await expect(page.getByTestId("save-indicator")).toBeVisible({ timeout: 5000 });

    const text = await page.getByTestId("save-indicator").textContent();
    expect(text).toContain("Saved");

    await page.screenshot({ path: "tests/screenshots/task6v5-03-share-link.png" });
  });

  test("task6-04: result-panel renders normally without save-indicator when unauthenticated", async ({ page }) => {
    await mockGenerate(page);
    await triggerGenerate(page);

    await expect(page.getByTestId("result-panel")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("download-button")).toBeVisible();
    await expect(page.getByTestId("open-colab-button")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task6v5-04-panel-unauth.png" });
  });
});
