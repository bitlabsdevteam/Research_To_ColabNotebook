import { test, expect } from "@playwright/test";

test.describe("ApiKeyInput Redesign — Task 4", () => {
  test("lock icon is visible left of the input field", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({ path: "tests/screenshots/task4r-01-api-key-initial.png" });

    const lockIcon = page.getByTestId("api-key-lock-icon");
    await expect(lockIcon).toBeVisible();
  });

  test("eye toggle button is visible right of the input field", async ({ page }) => {
    await page.goto("/");

    const eyeToggle = page.getByTestId("api-key-eye-toggle");
    await expect(eyeToggle).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task4r-02-eye-toggle.png" });
  });

  test("input starts as password type (hidden text)", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("api-key-input");
    const inputType = await input.getAttribute("type");
    expect(inputType).toBe("password");
  });

  test("clicking eye toggle reveals the API key text", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("api-key-input");
    await input.fill("sk-test-reveal-key");

    // Type should be password initially
    expect(await input.getAttribute("type")).toBe("password");

    // Click toggle
    await page.getByTestId("api-key-eye-toggle").click();
    await page.screenshot({ path: "tests/screenshots/task4r-03-key-revealed.png" });

    // Type should now be text
    expect(await input.getAttribute("type")).toBe("text");
  });

  test("clicking eye toggle again hides the API key text", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("api-key-input");
    await input.fill("sk-test-hide-key");

    const toggle = page.getByTestId("api-key-eye-toggle");
    await toggle.click(); // reveal
    await toggle.click(); // hide again

    expect(await input.getAttribute("type")).toBe("password");

    await page.screenshot({ path: "tests/screenshots/task4r-04-key-hidden-again.png" });
  });

  test("filled state shows green checkmark indicator", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("api-key-input");
    await input.fill("sk-test-filled");

    const indicator = page.getByTestId("api-key-indicator");
    await expect(indicator).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task4r-05-filled-indicator.png" });
  });

  test("empty state has no filled indicator", async ({ page }) => {
    await page.goto("/");

    const indicator = page.getByTestId("api-key-indicator");
    await expect(indicator).not.toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task4r-06-empty-no-indicator.png" });
  });

  test("original api-key-input testid is preserved", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("api-key-input");
    await expect(input).toBeVisible();
    await input.fill("sk-abc");
    await expect(input).toHaveValue("sk-abc");

    await page.screenshot({ path: "tests/screenshots/task4r-07-testid-preserved.png" });
  });
});
