const { test, expect } = require("@playwright/test");

test.describe("Route protection", () => {
  test("unauthenticated user is redirected from /clerk to /login", async ({ page }) => {
    await page.goto("/clerk");
    await expect(page).toHaveURL("/login");
  });

  test("unauthenticated user is redirected from /faculty to /login", async ({ page }) => {
    await page.goto("/faculty");
    await expect(page).toHaveURL("/login");
  });

  test("unauthenticated user is redirected from /super-admin to /login", async ({ page }) => {
    await page.goto("/super-admin");
    await expect(page).toHaveURL("/login");
  });

  test("unknown routes redirect to /login", async ({ page }) => {
    await page.goto("/some/unknown/path");
    await expect(page).toHaveURL("/login");
  });
});
