import { test, expect } from "@playwright/test";

test.describe("Form Card Step Dividers — Task 9", () => {
  test("form card has glass backdrop-filter applied", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({ path: "tests/screenshots/task9-01-form-card.png" });

    const hasBlur = await page.evaluate(() => {
      const el = document.querySelector("[data-testid='form-card']") as HTMLElement;
      const style = getComputedStyle(el);
      return (
        style.backdropFilter.includes("blur") ||
        (style as any).webkitBackdropFilter?.includes("blur")
      );
    });
    expect(hasBlur).toBe(true);
  });

  test("step label for API key section is visible", async ({ page }) => {
    await page.goto("/");

    const label = page.getByTestId("step-label-1");
    await expect(label).toBeVisible();
    await expect(label).toContainText(/api key/i);

    await page.screenshot({ path: "tests/screenshots/task9-02-step-label-1.png" });
  });

  test("step label for PDF upload section is visible", async ({ page }) => {
    await page.goto("/");

    const label = page.getByTestId("step-label-2");
    await expect(label).toBeVisible();
    await expect(label).toContainText(/upload/i);

    await page.screenshot({ path: "tests/screenshots/task9-03-step-label-2.png" });
  });

  test("step label for generate section is visible", async ({ page }) => {
    await page.goto("/");

    const label = page.getByTestId("step-label-3");
    await expect(label).toBeVisible();
    await expect(label).toContainText(/generate/i);

    await page.screenshot({ path: "tests/screenshots/task9-04-step-label-3.png" });
  });

  test("step dividers are present between sections", async ({ page }) => {
    await page.goto("/");

    const dividers = page.getByTestId("step-divider");
    // Should have at least 2 dividers (between 3 sections)
    const count = await dividers.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await page.screenshot({ path: "tests/screenshots/task9-05-step-dividers.png" });
  });

  test("step labels have step-label CSS class", async ({ page }) => {
    await page.goto("/");

    const allStepLabels = await page.evaluate(() => {
      const labels = document.querySelectorAll("[data-testid^='step-label-']");
      return Array.from(labels).every((el) => el.classList.contains("step-label"));
    });
    expect(allStepLabels).toBe(true);

    await page.screenshot({ path: "tests/screenshots/task9-06-step-label-class.png" });
  });

  test("all original form data-testids still reachable inside card", async ({ page }) => {
    await page.goto("/");

    // All form elements must remain accessible
    await expect(page.getByTestId("api-key-input")).toBeVisible();
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
    await expect(page.getByTestId("generate-button")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task9-07-form-elements-accessible.png" });
  });
});
