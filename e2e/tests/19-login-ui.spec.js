/**
 * Login page UI — college code flow, show/hide password,
 * phone digit enforcement, successful login redirects.
 */
const { test, expect } = require("@playwright/test");

const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE || "9999999999";
const SUPER_ADMIN_PASS  = process.env.SUPER_ADMIN_PASS  || "Admin@123";
const CLERK_PHONE       = process.env.CLERK_PHONE       || "9100000000";
const CLERK_PASS        = process.env.CLERK_PASS        || "Clerk@123";
const FACULTY_PHONE     = process.env.FACULTY_PHONE     || "9200000000";
const FACULTY_PASS      = process.env.FACULTY_PASS      || "Faculty@123";
const COLLEGE_CODE      = process.env.COLLEGE_CODE      || "TESTCOL1";
const COLLEGE_ID        = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Login UI", () => {

  test("navigating to / shows the college code step", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("college-code-input")).toBeVisible();
  });

  test("code shorter than 8 chars shows inline error", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill("ABCD");
    await page.getByTestId("code-submit").click();
    await expect(page.getByTestId("code-error")).toContainText("8");
  });

  test("unknown college code shows error", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill("XXXXXXXX");
    await page.getByTestId("code-submit").click();
    await expect(page.getByTestId("code-error")).toBeVisible();
  });

  test("valid college code advances to credentials step", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill(COLLEGE_CODE);
    await page.getByTestId("code-submit").click();
    // Should now show phone/password fields
    await expect(page.getByTestId("login-phone")).toBeVisible();
    await expect(page.getByTestId("login-password")).toBeVisible();
  });

  test("college name is shown on credentials step", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill(COLLEGE_CODE);
    await page.getByTestId("code-submit").click();
    await expect(page.locator("text=/Test College E2E/i")).toBeVisible();
  });

  test("phone input only accepts digits", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill(COLLEGE_CODE);
    await page.getByTestId("code-submit").click();
    await page.getByTestId("login-phone").fill("abc12def34");
    const val = await page.getByTestId("login-phone").inputValue();
    expect(val).toMatch(/^\d+$/);
  });

  test("phone input capped at 10 digits", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill(COLLEGE_CODE);
    await page.getByTestId("code-submit").click();
    await page.getByTestId("login-phone").fill("12345678901234");
    const val = await page.getByTestId("login-phone").inputValue();
    expect(val.length).toBeLessThanOrEqual(10);
  });

  test("show/hide password toggle works", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill(COLLEGE_CODE);
    await page.getByTestId("code-submit").click();

    const pwInput = page.getByTestId("login-password");
    await expect(pwInput).toHaveAttribute("type", "password");

    // Click the eye toggle button
    await page.locator("button[type='button']").filter({ has: page.locator("svg") }).click();
    await expect(pwInput).toHaveAttribute("type", "text");

    // Click again to hide
    await page.locator("button[type='button']").filter({ has: page.locator("svg") }).click();
    await expect(pwInput).toHaveAttribute("type", "password");
  });

  test("← Change college code link goes back to code step", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill(COLLEGE_CODE);
    await page.getByTestId("code-submit").click();
    await page.getByText("← Change college code").click();
    await expect(page.getByTestId("college-code-input")).toBeVisible();
  });

  test("super-admin link skips code step and shows super admin heading", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Super-admin access").click();
    await expect(page.getByText(/super admin/i)).toBeVisible();
    await expect(page.getByTestId("login-phone")).toBeVisible();
  });

  test("clerk login succeeds and redirects to /clerk", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill(COLLEGE_CODE);
    await page.getByTestId("code-submit").click();
    await page.getByTestId("login-phone").fill(CLERK_PHONE);
    await page.getByTestId("login-password").fill(CLERK_PASS);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/clerk/, { timeout: 8000 });
  });

  test("faculty login succeeds and redirects to /faculty", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill(COLLEGE_CODE);
    await page.getByTestId("code-submit").click();
    await page.getByTestId("login-phone").fill(FACULTY_PHONE);
    await page.getByTestId("login-password").fill(FACULTY_PASS);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/faculty/, { timeout: 8000 });
  });

  test("super-admin login succeeds and redirects to /super-admin", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Super-admin access").click();
    await page.getByTestId("login-phone").fill(SUPER_ADMIN_PHONE);
    await page.getByTestId("login-password").fill(SUPER_ADMIN_PASS);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/super-admin/, { timeout: 8000 });
  });

  test("sign out button on clerk page returns to login", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("college-code-input").fill(COLLEGE_CODE);
    await page.getByTestId("code-submit").click();
    await page.getByTestId("login-phone").fill(CLERK_PHONE);
    await page.getByTestId("login-password").fill(CLERK_PASS);
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/\/clerk/, { timeout: 8000 });

    await page.getByRole("button", { name: /sign out/i }).click();
    await expect(page).toHaveURL("/");
    // localStorage should be cleared
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeNull();
  });
});
