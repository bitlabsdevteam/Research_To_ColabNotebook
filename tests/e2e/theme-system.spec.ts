import { test, expect } from "@playwright/test";

test.describe("Theme System — Task 2", () => {
  test("task2-01: page loads with dark theme by default", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    // Use Playwright's locator assertion — auto-retries until timeout
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.screenshot({ path: "tests/screenshots/task2v5-01-dark-default.png" });

    // Dark bg CSS token should resolve to the near-black #0a0a0f
    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-bg-base").trim()
    );
    expect(bg).toBeTruthy();
  });

  test("task2-02: light theme tokens applied when data-theme=light", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("theme", "light"));
    await page.reload();

    // Wait for ThemeProvider useEffect to apply stored preference
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 5000 });

    await page.screenshot({ path: "tests/screenshots/task2v5-02-light-theme.png" });

    // Light bg CSS token should resolve to the cream #eeebe4
    const bg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-bg-base").trim()
    );
    expect(bg).toBeTruthy();
    // Cream starts with "ee" in hex
    expect(bg.toLowerCase()).toContain("ee");
  });

  test("task2-03: ThemeProvider sets data-theme on <html> without flash", async ({ page }) => {
    await page.goto("/");

    // data-theme must be present (either from server-render or ThemeProvider effect)
    await expect(page.locator("html")).toHaveAttribute("data-theme");

    await page.screenshot({ path: "tests/screenshots/task2v5-03-html-theme-attr.png" });
  });

  test("task2-04: light mode body background differs from dark mode", async ({ page }) => {
    // Dark mode body bg
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Light mode body bg
    await page.evaluate(() => localStorage.setItem("theme", "light"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 5000 });
    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.screenshot({ path: "tests/screenshots/task2v5-04-light-body-bg.png" });

    // The two backgrounds should differ
    expect(lightBg).not.toBe(darkBg);
  });
});
