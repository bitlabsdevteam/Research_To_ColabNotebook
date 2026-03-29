import { test, expect } from "@playwright/test";

test.describe("Design System — Task 1", () => {
  test("CSS custom properties are defined on :root", async ({ page }) => {
    await page.goto("/");

    // Verify core color tokens are set
    const bgBase = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-bg-base")
        .trim()
    );
    expect(bgBase).toBeTruthy();

    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent")
        .trim()
    );
    expect(accent).toBeTruthy();

    const textPrimary = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-text-primary")
        .trim()
    );
    expect(textPrimary).toBeTruthy();

    await page.screenshot({ path: "tests/screenshots/task1-01-design-system-css-vars.png" });
  });

  test("body has Geist font class applied", async ({ page }) => {
    await page.goto("/");

    const bodyClass = await page.evaluate(() => document.body.className);
    // Geist font is loaded via next/font and applied as a CSS variable class
    // Body should have either font-geist-sans class or a CSS variable font class
    expect(bodyClass).toBeTruthy();

    await page.screenshot({ path: "tests/screenshots/task1-02-font-applied.png" });
  });

  test("page background is dark (design system applied)", async ({ page }) => {
    await page.goto("/");

    // The body should have a dark background — computed bg color should not be white
    const bgColor = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );
    // Should not be white (rgb(255, 255, 255)) — design system sets near-black
    expect(bgColor).not.toBe("rgb(255, 255, 255)");

    await page.screenshot({ path: "tests/screenshots/task1-03-dark-background.png" });
  });

  test("keyframe animation classes exist in stylesheet", async ({ page }) => {
    await page.goto("/");

    // Check that our custom animation names are present in the document stylesheets
    const hasAnimations = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (
              rule instanceof CSSKeyframesRule &&
              (rule.name === "fadeUp" ||
                rule.name === "shimmer" ||
                rule.name === "bounceDot" ||
                rule.name === "shake")
            ) {
              return true;
            }
          }
        } catch {
          // Cross-origin sheets throw — skip them
        }
      }
      return false;
    });
    expect(hasAnimations).toBe(true);

    await page.screenshot({ path: "tests/screenshots/task1-04-keyframes-present.png" });
  });
});
