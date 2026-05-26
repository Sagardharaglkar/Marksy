/**
 * Clerk: faculty CRUD — create, edit, duplicate phone, delete.
 */
const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken, apiPost, apiGet, apiPut, apiDelete } = require("../helpers/auth");

const CLERK_PHONE = process.env.CLERK_PHONE || "9100000000";
const CLERK_PASS  = process.env.CLERK_PASS  || "Clerk@123";
const COLLEGE_ID  = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Clerk: faculty CRUD", () => {
  let token;
  let createdFacultyId;

  test.beforeAll(async () => {
    token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "clerk", name: "Clerk" });
    await page.goto("/clerk");
    await page.getByTestId("tab-faculty").click();
  });

  test("faculty tab renders table or empty state", async ({ page }) => {
    const table = page.getByTestId("faculty-table");
    const empty = page.locator("text=/No faculty/i");
    await expect(table.or(empty)).toBeVisible();
  });

  test("create faculty via API", async () => {
    const res = await apiPost("/clerk/faculty", {
      name: "E2E Faculty CRUD",
      phone: "9400000088",
      password: "Faculty@1234",
    }, token);
    expect(res.user_id).toBeTruthy();
    createdFacultyId = res.user_id;
  });

  test("new faculty appears in faculty table", async ({ page }) => {
    await expect(page.getByText("E2E Faculty CRUD")).toBeVisible();
  });

  test("edit faculty name via API", async () => {
    if (!createdFacultyId) test.skip(true, "depends on create test");
    const res = await apiPut(`/clerk/faculty/${createdFacultyId}`, {
      name: "E2E Faculty Renamed",
      phone: "9400000088",
    }, token);
    expect(res.ok).toBe(true);
  });

  test("renamed faculty name shows in table", async ({ page }) => {
    await expect(page.getByText("E2E Faculty Renamed")).toBeVisible();
  });

  test("creating faculty with duplicate phone is rejected", async () => {
    // 9200000000 already exists from seed
    const res = await apiPost("/clerk/faculty", {
      name: "Dup Faculty",
      phone: "9200000000",
      password: "Pass@123",
    }, token);
    expect(res.error).toMatch(/already registered/i);
  });

  test("creating faculty with missing fields is rejected", async () => {
    const res = await apiPost("/clerk/faculty", { name: "No Phone" }, token);
    expect(res.error).toBeTruthy();
  });

  test("created faculty can log in with their credentials", async () => {
    const loginRes = await apiPost("/auth/login", {
      college_id: COLLEGE_ID,
      phone: "9400000088",
      password: "Faculty@1234",
    });
    expect(loginRes.token).toBeTruthy();
    expect(loginRes.user.role).toBe("faculty");
  });

  test("delete faculty via API", async () => {
    if (!createdFacultyId) test.skip(true, "depends on create test");
    const res = await apiDelete(`/clerk/faculty/${createdFacultyId}`, token);
    expect(res.ok).toBe(true);

    const faculty = await apiGet("/clerk/faculty", token);
    expect(faculty.find(f => f.user_id === createdFacultyId)).toBeFalsy();
  });

  test("UI search filters faculty by name", async ({ page }) => {
    // Type an existing faculty name in search
    await page.locator("input[placeholder*='Search']").fill("Test Faculty");
    await expect(page.getByText("Test Faculty")).toBeVisible();
    // Type something that won't match
    await page.locator("input[placeholder*='Search']").fill("zzzznotexist");
    await expect(page.locator("text=/No faculty match/i")).toBeVisible();
  });
});
