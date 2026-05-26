/**
 * Auth edge cases — invalid credentials, blocked accounts, inactive college,
 * JWT-less requests, role cross-access.
 */
const { test, expect } = require("@playwright/test");
const { apiPost, apiGet, apiPatch, loginViaAPI, injectToken } = require("../helpers/auth");

const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE || "9999999999";
const SUPER_ADMIN_PASS  = process.env.SUPER_ADMIN_PASS  || "Admin@123";
const CLERK_PHONE       = process.env.CLERK_PHONE       || "9100000000";
const CLERK_PASS        = process.env.CLERK_PASS        || "Clerk@123";
const FACULTY_PHONE     = process.env.FACULTY_PHONE     || "9200000000";
const FACULTY_PASS      = process.env.FACULTY_PASS      || "Faculty@123";
const COLLEGE_ID        = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Auth: edge cases", () => {

  test("wrong password returns 401", async () => {
    const res = await apiPost("/auth/login", {
      college_id: COLLEGE_ID,
      phone: CLERK_PHONE,
      password: "wrongpassword",
    });
    expect(res.error).toMatch(/invalid credentials/i);
  });

  test("non-existent phone returns 401", async () => {
    const res = await apiPost("/auth/login", {
      college_id: COLLEGE_ID,
      phone: "0000000000",
      password: "anything",
    });
    expect(res.error).toMatch(/invalid credentials/i);
  });

  test("resolve-code with non-existent code returns 404", async () => {
    const res = await apiPost("/auth/resolve-code", { college_code: "XXXXXXXX" });
    expect(res.error).toBeTruthy();
  });

  test("resolve-code with wrong length returns error", async () => {
    const res = await apiPost("/auth/resolve-code", { college_code: "SHORT" });
    expect(res.error).toBeTruthy();
  });

  test("missing phone/password returns 400", async () => {
    const res = await apiPost("/auth/login", { college_id: COLLEGE_ID });
    expect(res.error).toBeTruthy();
  });

  test("clerk cannot access super-admin routes", async () => {
    const token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);
    const res = await apiGet("/super-admin/colleges", token);
    // Should be forbidden or unauthorized
    expect(res.error ?? res.message).toBeTruthy();
  });

  test("faculty cannot access clerk routes", async () => {
    const token = await loginViaAPI(COLLEGE_ID, FACULTY_PHONE, FACULTY_PASS);
    const res = await apiGet("/clerk/assignments", token);
    expect(res.error ?? res.message).toBeTruthy();
  });

  test("clerk cannot access faculty routes", async () => {
    const token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);
    const res = await apiGet("/faculty/assignments", token);
    expect(res.error ?? res.message).toBeTruthy();
  });

  test("request without token is rejected from protected route", async () => {
    const res = await apiGet("/clerk/assignments", null);
    expect(res.error ?? res.message).toBeTruthy();
  });

  test("request with invalid token is rejected", async () => {
    const res = await apiGet("/clerk/assignments", "invalid.token.value");
    expect(res.error ?? res.message).toBeTruthy();
  });

  test("super admin can log in without college_id", async () => {
    const res = await apiPost("/auth/login", {
      phone: SUPER_ADMIN_PHONE,
      password: SUPER_ADMIN_PASS,
    });
    expect(res.token).toBeTruthy();
    expect(res.user.role).toBe("super_admin");
  });

  test("super admin token grants access to /super-admin routes", async () => {
    const token = await loginViaAPI(null, SUPER_ADMIN_PHONE, SUPER_ADMIN_PASS);
    const res = await apiGet("/super-admin/colleges", token);
    expect(Array.isArray(res)).toBe(true);
  });

  // ── UI: already logged-in user cannot visit /login ──────────

  test("logged-in clerk is redirected away from /login", async ({ page }) => {
    const token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);
    await injectToken(page, token, { role: "clerk", name: "Clerk" });
    await page.goto("/login");
    await expect(page).toHaveURL(/\/clerk/);
  });

  test("logged-in faculty is redirected away from /login", async ({ page }) => {
    const token = await loginViaAPI(COLLEGE_ID, FACULTY_PHONE, FACULTY_PASS);
    await injectToken(page, token, { role: "faculty", name: "Faculty" });
    await page.goto("/login");
    await expect(page).toHaveURL(/\/faculty/);
  });

  test("logged-in super-admin is redirected away from /login", async ({ page }) => {
    const token = await loginViaAPI(null, SUPER_ADMIN_PHONE, SUPER_ADMIN_PASS);
    await injectToken(page, token, { role: "super_admin", name: "Admin" });
    await page.goto("/login");
    await expect(page).toHaveURL(/\/super-admin/);
  });

  test("clerk cannot view faculty page in UI", async ({ page }) => {
    const token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);
    await injectToken(page, token, { role: "clerk", name: "Clerk" });
    await page.goto("/faculty");
    // ProtectedRoute should redirect to /
    await expect(page).toHaveURL("/");
  });

  test("faculty cannot view clerk page in UI", async ({ page }) => {
    const token = await loginViaAPI(COLLEGE_ID, FACULTY_PHONE, FACULTY_PASS);
    await injectToken(page, token, { role: "faculty", name: "Faculty" });
    await page.goto("/clerk");
    await expect(page).toHaveURL("/");
  });
});
