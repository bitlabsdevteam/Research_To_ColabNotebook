import { test, expect } from "@playwright/test";

const MOCK_NOTEBOOK = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { name: "python3" } },
  cells: [{ cell_type: "markdown", source: "# Test", metadata: {}, outputs: [] }],
};

const SHARE_ID = "test-share-789";

async function setupWithShareId(page: import("@playwright/test").Page) {
  // Grant clipboard permissions
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.route("**/generate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_NOTEBOOK),
    })
  );

  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("theme"));
  await page.reload();

  // Inject mock user + save ID
  await expect(page.getByTestId("sign-in-button")).toBeVisible({ timeout: 5000 });
  await page.evaluate((id) => {
    window.dispatchEvent(
      new CustomEvent("__supabase_mock_session", {
        detail: {
          user: {
            id: "user-123",
            email: "test@example.com",
            user_metadata: { avatar_url: "", full_name: "Test" },
          },
        },
      })
    );
    (window as any).__supabase_mock_save_id = id;
  }, SHARE_ID);

  // Fill API key
  const apiKeyInput = page.locator('input[type="password"], input[type="text"]').first();
  await apiKeyInput.fill("sk-test-key-12345");

  // Upload dummy PDF
  await page.locator('input[type="file"]').setInputFiles({
    name: "paper.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 test"),
  });

  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("result-panel")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("save-indicator")).toBeVisible({ timeout: 5000 });
}

test.describe("Copy Link Button — Task 7", () => {
  test("task7-01: copy-link-button visible when shareId is present", async ({ page }) => {
    await setupWithShareId(page);
    await page.screenshot({ path: "tests/screenshots/task7v5-01-copy-btn-visible.png" });
    await expect(page.getByTestId("copy-link-button")).toBeVisible();
  });

  test("task7-02: copy-link-button writes correct URL to clipboard", async ({ page }) => {
    await setupWithShareId(page);
    await page.getByTestId("copy-link-button").click();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(`http://localhost:3000/notebook/${SHARE_ID}`);

    await page.screenshot({ path: "tests/screenshots/task7v5-02-after-copy.png" });
  });

  test("task7-03: button text changes to 'Copied!' after click", async ({ page }) => {
    await setupWithShareId(page);
    await page.getByTestId("copy-link-button").click();

    await expect(page.getByTestId("copy-link-button")).toHaveText("Copied!", { timeout: 1000 });
    await page.screenshot({ path: "tests/screenshots/task7v5-03-copied-state.png" });
  });

  test("task7-04: button text reverts after 2 seconds", async ({ page }) => {
    await setupWithShareId(page);
    await page.getByTestId("copy-link-button").click();
    await expect(page.getByTestId("copy-link-button")).toHaveText("Copied!", { timeout: 1000 });

    // Wait for revert (2s + buffer)
    await expect(page.getByTestId("copy-link-button")).toHaveText(/Copy link/i, { timeout: 4000 });
    await page.screenshot({ path: "tests/screenshots/task7v5-04-reverted.png" });
  });

  test("task7-05: copy-link-button not shown when shareId is absent", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({ path: "tests/screenshots/task7v5-05-no-copy-btn.png" });
    // Without shareId in result panel, button should not exist
    await expect(page.getByTestId("copy-link-button")).not.toBeVisible();
  });
});
