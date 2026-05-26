const { test, expect } = require("@playwright/test");

test.describe("Login page", () => {
  test("shows login page at /login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-page")).toBeVisible();
  });

  test("shows required field error when submitting empty form", async ({ page }) => {
    // Arrive via super-admin path so the credentials form renders
    await page.goto("/login");
    await page.getByText("Super-admin access").click();
    await expect(page.getByTestId("login-page")).toBeVisible();

    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page.getByTestId("login-error")).toContainText("required");
  });

  test("shows error for bad credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Super-admin access").click();

    await page.getByTestId("login-phone").fill("9999999999");
    await page.getByTestId("login-password").fill("wrongpass");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
  });

  test("back link returns to college code step", async ({ page }) => {
    await page.goto("/login");
    await page.getByText("Super-admin access").click();
    await page.getByText("← Change college code").click();
    await expect(page.getByTestId("college-code-input")).toBeVisible();
  });
});
