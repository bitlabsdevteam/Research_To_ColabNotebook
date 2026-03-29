import { test, expect } from "@playwright/test";

/** Inject a mock user session via the test-only custom event */
async function injectMockUser(page: import("@playwright/test").Page) {
  // Ensure the component is mounted and in unauthenticated state first
  await expect(page.getByTestId("sign-in-button")).toBeVisible({ timeout: 5000 });

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("__supabase_mock_session", {
        detail: {
          user: {
            id: "test-user-123",
            email: "test@example.com",
            user_metadata: {
              avatar_url: "https://placehold.co/32x32",
              full_name: "Test User",
            },
          },
        },
      })
    );
  });
}

test.describe("Auth Flow — Task 5", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();
  });

  test("task5-01: sign-in button is visible in header when unauthenticated", async ({ page }) => {
    await page.screenshot({ path: "tests/screenshots/task5v5-01-header-unauth.png" });

    await expect(page.getByTestId("sign-in-button")).toBeVisible();
  });

  test("task5-02: user avatar is not visible when unauthenticated", async ({ page }) => {
    await page.screenshot({ path: "tests/screenshots/task5v5-02-no-avatar.png" });

    await expect(page.getByTestId("user-avatar")).not.toBeVisible();
  });

  test("task5-03: after sign-in, avatar appears and sign-in button disappears", async ({ page }) => {
    // Inject mock user session via dev-only event
    await injectMockUser(page);

    // Avatar should appear
    await expect(page.getByTestId("user-avatar")).toBeVisible({ timeout: 3000 });

    // Sign-in button should be hidden
    await expect(page.getByTestId("sign-in-button")).not.toBeVisible();

    await page.screenshot({ path: "tests/screenshots/task5v5-03-header-auth.png" });
  });

  test("task5-04: sign-out button appears when authenticated", async ({ page }) => {
    await injectMockUser(page);

    await expect(page.getByTestId("sign-out-button")).toBeVisible({ timeout: 3000 });
    await page.screenshot({ path: "tests/screenshots/task5v5-04-signout-button.png" });
  });

  test("task5-05: sign-in button in header has accessible label", async ({ page }) => {
    const btn = page.getByTestId("sign-in-button");
    await expect(btn).toBeVisible();
    const label = await btn.textContent();
    expect(label?.trim()).toBeTruthy();
    await page.screenshot({ path: "tests/screenshots/task5v5-05-signin-label.png" });
  });
});
