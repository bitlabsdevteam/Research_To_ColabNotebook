import { test, expect } from "@playwright/test";

test.describe("Header & Footer — Task 3", () => {
  test("header is visible with brand title", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({ path: "tests/screenshots/task3-01-header-visible.png" });

    const header = page.getByTestId("site-header");
    await expect(header).toBeVisible();

    const brandTitle = page.getByTestId("header-brand-title");
    await expect(brandTitle).toBeVisible();
    await expect(brandTitle).toContainText("Paper2Notebook");
  });

  test("header contains GitHub link", async ({ page }) => {
    await page.goto("/");

    const githubLink = page.getByTestId("header-github-link");
    await expect(githubLink).toBeVisible();

    // Should be an anchor with href pointing to GitHub
    const href = await githubLink.getAttribute("href");
    expect(href).toContain("github.com");

    await page.screenshot({ path: "tests/screenshots/task3-02-header-github-link.png" });
  });

  test("header has logo mark SVG", async ({ page }) => {
    await page.goto("/");

    const logoMark = page.getByTestId("header-logo");
    await expect(logoMark).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task3-03-header-logo.png" });
  });

  test("footer is visible with version text", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({ path: "tests/screenshots/task3-04-footer.png" });

    const footer = page.getByTestId("site-footer");
    await expect(footer).toBeVisible();
  });

  test("footer contains Paper2Notebook branding text", async ({ page }) => {
    await page.goto("/");

    const footer = page.getByTestId("site-footer");
    await expect(footer).toContainText("Paper2Notebook");

    await page.screenshot({ path: "tests/screenshots/task3-05-footer-text.png" });
  });

  test("header is positioned at the top (sticky/fixed)", async ({ page }) => {
    await page.goto("/");

    const header = page.getByTestId("site-header");
    const box = await header.boundingBox();
    // Header top should be at or near 0
    expect(box?.y).toBeLessThanOrEqual(10);

    await page.screenshot({ path: "tests/screenshots/task3-06-header-position.png" });
  });

  test("all original data-testid elements still present after header/footer added", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("app-title")).toBeVisible();
    await expect(page.getByTestId("api-key-input")).toBeVisible();
    await expect(page.getByTestId("pdf-dropzone")).toBeVisible();
    await expect(page.getByTestId("generate-button")).toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task3-07-testids-intact.png" });
  });
});
