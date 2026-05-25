const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken } = require("../helpers/auth");

// These tests assume a super_admin account exists with the credentials below.
// Run migrations and seed the super-admin before running these tests.
const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE || "9000000000";
const SUPER_ADMIN_PASS  = process.env.SUPER_ADMIN_PASS  || "Admin@123";

test.describe("Super-admin dashboard", () => {
  let token;

  test.beforeAll(async () => {
    token = await loginViaAPI(null, SUPER_ADMIN_PHONE, SUPER_ADMIN_PASS);
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "super_admin", name: "Admin" });
    await page.goto("/super-admin");
  });

  test("renders dashboard with colleges table or empty state", async ({ page }) => {
    // Either the table or empty-state must be present
    const table = page.getByTestId("colleges-table");
    const empty = page.locator(".empty-state");
    await expect(table.or(empty)).toBeVisible();
  });

  test("opens new college modal", async ({ page }) => {
    await page.getByTestId("add-college-btn").click();
    await expect(page.getByTestId("college-modal")).toBeVisible();
  });

  test("creates a new college and shows the generated code", async ({ page }) => {
    await page.getByTestId("add-college-btn").click();
    await page.getByTestId("college-name-input").fill("Test College E2E");
    await page.getByTestId("college-submit").click();
    await expect(page.getByTestId("college-code-result")).toBeVisible();
    const codeText = await page.getByTestId("college-code-result").textContent();
    expect(codeText).toMatch(/[A-Z0-9]{8}/);
  });

  test("shows validation error when college name is empty", async ({ page }) => {
    await page.getByTestId("add-college-btn").click();
    await page.getByTestId("college-submit").click();
    await expect(page.locator(".form-error")).toBeVisible();
  });
});
