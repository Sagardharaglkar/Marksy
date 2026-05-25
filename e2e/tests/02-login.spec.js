const { test, expect } = require("@playwright/test");

test.describe("Login page", () => {
  test("redirects to / if accessed without college state", async ({ page }) => {
    // Navigate directly without location state — should bounce back to /
    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });

  test("shows required field error when submitting empty form", async ({ page }) => {
    // Arrive via super-admin path so the page renders
    await page.goto("/");
    await page.getByText("Super-admin access").click();
    await expect(page.getByTestId("login-page")).toBeVisible();

    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page.getByTestId("login-error")).toContainText("required");
  });

  test("shows error for bad credentials", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Super-admin access").click();

    await page.getByTestId("login-phone").fill("9999999999");
    await page.getByTestId("login-password").fill("wrongpass");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("login-error")).toBeVisible();
  });

  test("back link returns to college code page", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Super-admin access").click();
    await page.getByText("← Back").click();
    await expect(page).toHaveURL("/");
  });
});
