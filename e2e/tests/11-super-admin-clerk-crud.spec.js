/**
 * Super-admin: full clerk CRUD + college active toggle
 * Requires a super-admin account and at least one college.
 */
const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken, apiPost, apiGet, apiPut, apiDelete, apiPatch } = require("../helpers/auth");

const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE || "9999999999";
const SUPER_ADMIN_PASS  = process.env.SUPER_ADMIN_PASS  || "Admin@123";
const COLLEGE_CODE      = process.env.COLLEGE_CODE      || "TESTCOL1";

test.describe("Super-admin: clerk CRUD", () => {
  let token;
  let college_id;
  let createdClerkId;

  test.beforeAll(async () => {
    token = await loginViaAPI(null, SUPER_ADMIN_PHONE, SUPER_ADMIN_PASS);
    const colleges = await apiGet("/super-admin/colleges", token);
    const college = colleges.find(c => c.college_code === COLLEGE_CODE) || colleges[0];
    if (!college) throw new Error("No colleges found — run seed_test_data.sql first");
    college_id = college.college_id;
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "super_admin", name: "Admin" });
    await page.goto("/super-admin");
  });

  test("college list is visible", async ({ page }) => {
    await expect(page.getByTestId("colleges-table")).toBeVisible();
  });

  test("can create a clerk via API and it appears in clerk list", async () => {
    const res = await apiPost(
      `/super-admin/colleges/${college_id}/clerk`,
      { college_id, name: "E2E Clerk", phone: "9300000099", password: "Test@1234" },
      token
    );
    expect(res.user_id).toBeTruthy();
    createdClerkId = res.user_id;

    const clerks = await apiGet(`/super-admin/colleges/${college_id}/clerks`, token);
    const found = clerks.find(c => c.user_id === createdClerkId);
    expect(found).toBeTruthy();
    expect(found.name).toBe("E2E Clerk");
  });

  test("can edit clerk name and phone via API", async () => {
    if (!createdClerkId) test.skip(true, "depends on previous test");
    const res = await apiPut(
      `/super-admin/colleges/${college_id}/clerks/${createdClerkId}`,
      { name: "E2E Clerk Renamed", phone: "9300000099" },
      token
    );
    expect(res.ok).toBe(true);

    const clerks = await apiGet(`/super-admin/colleges/${college_id}/clerks`, token);
    const found = clerks.find(c => c.user_id === createdClerkId);
    expect(found.name).toBe("E2E Clerk Renamed");
  });

  test("can block and unblock clerk via API", async () => {
    if (!createdClerkId) test.skip(true, "depends on previous test");

    // Block
    let res = await apiPatch(
      `/super-admin/colleges/${college_id}/clerks/${createdClerkId}/block`,
      { is_blocked: true },
      token
    );
    expect(res.ok).toBe(true);
    expect(res.is_blocked).toBe(true);

    // Blocked clerk cannot login
    const loginRes = await apiPost("/auth/login", {
      college_id, phone: "9300000099", password: "Test@1234"
    });
    expect(loginRes.error).toMatch(/blocked/i);

    // Unblock
    res = await apiPatch(
      `/super-admin/colleges/${college_id}/clerks/${createdClerkId}/block`,
      { is_blocked: false },
      token
    );
    expect(res.is_blocked).toBe(false);
  });

  test("duplicate phone is rejected when creating clerk", async () => {
    const res = await apiPost(
      `/super-admin/colleges/${college_id}/clerk`,
      { college_id, name: "Dup Clerk", phone: "9100000000", password: "Test@1234" },
      token
    );
    expect(res.error).toBeTruthy();
  });

  test("can toggle college inactive, blocks login, then toggle active again", async () => {
    // Deactivate
    let res = await apiPatch(
      `/super-admin/colleges/${college_id}/active`,
      { is_active: false },
      token
    );
    expect(res.ok).toBe(true);

    // Clerk login should fail
    const loginRes = await apiPost("/auth/login", {
      college_id, phone: "9100000000", password: "Clerk@123"
    });
    expect(loginRes.error).toMatch(/disabled/i);

    // Reactivate
    res = await apiPatch(
      `/super-admin/colleges/${college_id}/active`,
      { is_active: true },
      token
    );
    expect(res.ok).toBe(true);
  });

  test("can delete the created clerk via API", async () => {
    if (!createdClerkId) test.skip(true, "depends on previous test");
    const res = await apiDelete(
      `/super-admin/colleges/${college_id}/clerks/${createdClerkId}`,
      token
    );
    expect(res.ok).toBe(true);

    const clerks = await apiGet(`/super-admin/colleges/${college_id}/clerks`, token);
    const found = clerks.find(c => c.user_id === createdClerkId);
    expect(found).toBeFalsy();
  });
});
