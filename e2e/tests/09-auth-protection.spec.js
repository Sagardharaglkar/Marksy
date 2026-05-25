const { test, expect } = require("@playwright/test");

test.describe("Route protection", () => {
  test("unauthenticated user is redirected from /clerk to /", async ({ page }) => {
    await page.goto("/clerk");
    await expect(page).toHaveURL("/");
  });

  test("unauthenticated user is redirected from /faculty to /", async ({ page }) => {
    await page.goto("/faculty");
    await expect(page).toHaveURL("/");
  });

  test("unauthenticated user is redirected from /super-admin to /", async ({ page }) => {
    await page.goto("/super-admin");
    await expect(page).toHaveURL("/");
  });

  test("unknown routes redirect to /", async ({ page }) => {
    await page.goto("/some/unknown/path");
    await expect(page).toHaveURL("/");
  });
});
