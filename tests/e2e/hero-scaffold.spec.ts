import { test, expect } from "@playwright/test";

test.describe("Hero Scaffold — Task 2", () => {
  test("page has dark full-screen background with dot-grid class", async ({
    page,
  }) => {
    await page.goto("/");
    await page.screenshot({ path: "tests/screenshots/task2-01-hero-page.png" });

    // Root wrapper should have dot-grid class for the texture
    const hasDotGrid = await page.evaluate(() =>
      document.querySelector(".dot-grid") !== null
    );
    expect(hasDotGrid).toBe(true);
  });

  test("radial spotlight element is present behind the card", async ({
    page,
  }) => {
    await page.goto("/");

    // Spotlight div should exist
    const spotlight = page.getByTestId("hero-spotlight");
    await expect(spotlight).toBeAttached();

    await page.screenshot({ path: "tests/screenshots/task2-02-spotlight.png" });
  });

  test("hero heading and subheading are visible", async ({ page }) => {
    await page.goto("/");

    const heroHeading = page.getByTestId("hero-heading");
    await expect(heroHeading).toBeVisible();

    const heroSubheading = page.getByTestId("app-description");
    await expect(heroSubheading).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/task2-03-hero-text.png",
    });
  });

  test("hero text has animate-fade-up class applied", async ({ page }) => {
    await page.goto("/");

    const heroBlock = page.getByTestId("hero-block");
    await expect(heroBlock).toBeVisible();

    const hasAnimation = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='hero-block']");
      return el?.classList.contains("animate-fade-up") ?? false;
    });
    expect(hasAnimation).toBe(true);

    await page.screenshot({
      path: "tests/screenshots/task2-04-hero-animation-class.png",
    });
  });

  test("form card has animate-fade-up-delay class", async ({ page }) => {
    await page.goto("/");

    const formCard = page.getByTestId("form-card");
    await expect(formCard).toBeVisible();

    const hasDelayAnimation = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='form-card']");
      return el?.classList.contains("animate-fade-up-delay") ?? false;
    });
    expect(hasDelayAnimation).toBe(true);

    await page.screenshot({
      path: "tests/screenshots/task2-05-form-card-animation.png",
    });
  });

  test("all original data-testid elements are still present", async ({
    page,
  }) => {
    await page.goto("/");

    // Ensure refactoring didn't break any existing selectors
    await expect(page.getByTestId("app-title")).toBeVisible();
    await expect(page.getByTestId("app-description")).toBeVisible();
    await expect(page.getByTestId("api-key-input")).toBeVisible();
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
    await expect(page.getByTestId("generate-button")).toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/task2-06-existing-testids-preserved.png",
    });
  });
});
