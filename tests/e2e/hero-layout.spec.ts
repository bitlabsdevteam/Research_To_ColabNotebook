import { test, expect } from "@playwright/test";

test.describe("Hero Layout — Task 4", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("task4-01: dark mode hero is single-column (centered)", async ({ page }) => {
    await page.screenshot({ path: "tests/screenshots/task4v5-01-hero-dark.png" });

    const heroBlock = page.getByTestId("hero-block");
    await expect(heroBlock).toBeVisible();

    // In dark mode, hero-block should be single column (not grid)
    const display = await heroBlock.evaluate((el) =>
      window.getComputedStyle(el).display
    );
    // Centered column — could be flex or block, NOT grid with two explicit columns
    expect(display).not.toBe("grid");
  });

  test("task4-02: light mode hero switches to two-column grid", async ({ page }) => {
    // Switch to light mode
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.screenshot({ path: "tests/screenshots/task4v5-02-hero-light.png" });

    const heroBlock = page.getByTestId("hero-block");
    await expect(heroBlock).toBeVisible();

    const display = await heroBlock.evaluate((el) =>
      window.getComputedStyle(el).display
    );
    expect(display).toBe("grid");
  });

  test("task4-03: data-testids preserved in both modes", async ({ page }) => {
    // Dark mode
    await expect(page.getByTestId("hero-block")).toBeVisible();
    await expect(page.getByTestId("app-title")).toBeVisible();
    await expect(page.getByTestId("app-description")).toBeVisible();

    // Switch to light mode
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await expect(page.getByTestId("hero-block")).toBeVisible();
    await expect(page.getByTestId("app-title")).toBeVisible();
    await expect(page.getByTestId("app-description")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task4v5-03-testids-light.png" });
  });

  test("task4-04: sign-in CTA visible in light mode when unauthenticated", async ({ page }) => {
    // Switch to light mode
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await expect(page.getByTestId("sign-in-cta")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task4v5-04-signin-cta-light.png" });
  });

  test("task4-05: display heading is large in light mode", async ({ page }) => {
    // Switch to light mode
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    const appTitle = page.getByTestId("app-title");
    await expect(appTitle).toBeVisible();

    const fontSize = await appTitle.evaluate((el) => {
      const px = parseFloat(window.getComputedStyle(el).fontSize);
      return px;
    });
    // Expect display-scale font: >= 48px
    expect(fontSize).toBeGreaterThanOrEqual(48);

    await page.screenshot({ path: "tests/screenshots/task4v5-05-display-font.png" });
  });
});
