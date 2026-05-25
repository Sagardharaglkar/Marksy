const { test, expect } = require("@playwright/test");

test.describe("College code entry page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the college code page", async ({ page }) => {
    await expect(page.getByTestId("college-code-page")).toBeVisible();
    await expect(page.getByTestId("college-code-input")).toBeVisible();
    await expect(page.getByTestId("code-submit")).toBeVisible();
  });

  test("shows error for code shorter than 8 chars", async ({ page }) => {
    await page.getByTestId("college-code-input").fill("ABC");
    await page.getByTestId("code-submit").click();
    await expect(page.getByTestId("code-error")).toBeVisible();
    await expect(page.getByTestId("code-error")).toContainText("8");
  });

  test("shows error for invalid college code", async ({ page }) => {
    await page.getByTestId("college-code-input").fill("XXXXXXXX");
    await page.getByTestId("code-submit").click();
    await expect(page.getByTestId("code-error")).toBeVisible();
  });

  test("input auto-uppercases characters", async ({ page }) => {
    await page.getByTestId("college-code-input").fill("abcdefgh");
    const value = await page.getByTestId("college-code-input").inputValue();
    expect(value).toBe("ABCDEFGH");
  });

  test("super-admin link navigates to login", async ({ page }) => {
    await page.getByText("Super-admin access").click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("login-page")).toBeVisible();
  });
});
