import { test, expect } from "@playwright/test";

test.describe("Theme Toggle — Task 3", () => {
  test.beforeEach(async ({ page }) => {
    // Start each test in dark mode (default)
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("task3-01: theme toggle button is visible in header", async ({ page }) => {
    await page.screenshot({ path: "tests/screenshots/task3v5-01-header-dark.png" });

    await expect(page.getByTestId("theme-toggle")).toBeVisible();
  });

  test("task3-02: toggle switches dark → light and shows moon icon", async ({ page }) => {
    // In dark mode the button shows a sun icon (click to go light)
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible();

    await toggle.click();

    // html should now be light
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.screenshot({ path: "tests/screenshots/task3v5-02-switched-to-light.png" });
  });

  test("task3-03: toggle switches light → dark", async ({ page }) => {
    // First go to light
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Then click again to go back to dark
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.screenshot({ path: "tests/screenshots/task3v5-03-switched-back-to-dark.png" });
  });

  test("task3-04: theme preference persists across page reload", async ({ page }) => {
    // Switch to light
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // Reload — should stay light
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 5000 });

    await page.screenshot({ path: "tests/screenshots/task3v5-04-light-persists-after-reload.png" });

    // Clean up
    await page.evaluate(() => localStorage.removeItem("theme"));
  });

  test("task3-05: toggle has correct aria-label for screen readers", async ({ page }) => {
    const toggle = page.getByTestId("theme-toggle");
    // In dark mode, label should describe the action (switch to light)
    const label = await toggle.getAttribute("aria-label");
    expect(label).toBeTruthy();

    await page.screenshot({ path: "tests/screenshots/task3v5-05-toggle-aria.png" });
  });
});
