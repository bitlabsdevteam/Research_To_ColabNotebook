import { test, expect } from "@playwright/test";

test.describe("API Key Input", () => {
  test("shows API key input on landing page", async ({ page }) => {
    await page.goto("/");
    await page.screenshot({
      path: "tests/screenshots/task2-01-landing-page.png",
    });

    const input = page.getByTestId("api-key-input");
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute("type", "password");
  });

  test("shows indicator when API key is entered", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("api-key-input");
    await input.fill("sk-test-key-12345");

    const indicator = page.getByTestId("api-key-indicator");
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText(/key set/i);

    await page.screenshot({
      path: "tests/screenshots/task2-02-key-entered.png",
    });
  });

  test("hides indicator when API key is cleared", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("api-key-input");
    await input.fill("sk-test-key-12345");
    await input.clear();

    const indicator = page.getByTestId("api-key-indicator");
    await expect(indicator).not.toBeVisible();

    await page.screenshot({
      path: "tests/screenshots/task2-03-key-cleared.png",
    });
  });

  test("masks the API key input", async ({ page }) => {
    await page.goto("/");

    const input = page.getByTestId("api-key-input");
    await expect(input).toHaveAttribute("type", "password");
  });
});
