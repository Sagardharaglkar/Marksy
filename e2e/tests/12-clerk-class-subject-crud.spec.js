/**
 * Clerk: class and subject CRUD via API + UI smoke checks.
 * Requires TESTCOL1 seed data.
 */
const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken, apiPost, apiGet, apiPut, apiDelete } = require("../helpers/auth");

const CLERK_PHONE = process.env.CLERK_PHONE || "9100000000";
const CLERK_PASS  = process.env.CLERK_PASS  || "Clerk@123";
const COLLEGE_ID  = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Clerk: class and subject CRUD", () => {
  let token;
  let createdClassId;
  let createdSubjectId;

  test.beforeAll(async () => {
    token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "clerk", name: "Clerk" });
    await page.goto("/clerk");
  });

  // ── Class CRUD ──────────────────────────────────────────────

  test("create class via API", async () => {
    const res = await apiPost("/clerk/classes", { name: "E2E Class CRUD" }, token);
    expect(res.class_id).toBeTruthy();
    createdClassId = res.class_id;
  });

  test("class appears in list after creation", async ({ page }) => {
    await expect(page.getByText("E2E Class CRUD")).toBeVisible();
  });

  test("rename class via API", async () => {
    if (!createdClassId) test.skip(true, "depends on previous test");
    const res = await apiPut(`/clerk/classes/${createdClassId}`, { name: "E2E Class Renamed" }, token);
    expect(res).toMatchObject({ message: "Updated" });
  });

  test("empty class name is rejected", async () => {
    const res = await apiPost("/clerk/classes", { name: "" }, token);
    expect(res.error).toBeTruthy();
  });

  // ── Subject CRUD ────────────────────────────────────────────

  test("create subject via API", async () => {
    if (!createdClassId) test.skip(true, "depends on previous test");
    const res = await apiPost(`/clerk/classes/${createdClassId}/subjects`, {
      name: "Math E2E",
      subject_code: "MTH999",
      internal_max: 30,
      external_max: 70,
    }, token);
    expect(res.subject_id).toBeTruthy();
    createdSubjectId = res.subject_id;
  });

  test("subject appears in class subject list", async () => {
    if (!createdClassId) test.skip(true, "depends on previous test");
    const subjects = await apiGet(`/clerk/classes/${createdClassId}/subjects`, token);
    const found = subjects.find(s => s.subject_code === "MTH999");
    expect(found).toBeTruthy();
    expect(found.name).toBe("Math E2E");
  });

  test("duplicate subject code is rejected", async () => {
    if (!createdClassId) test.skip(true, "depends on previous test");
    const res = await apiPost(`/clerk/classes/${createdClassId}/subjects`, {
      name: "Math Duplicate",
      subject_code: "MTH999",
    }, token);
    expect(res.error).toMatch(/already used/i);
  });

  test("subject code is uppercased", async () => {
    if (!createdClassId) test.skip(true, "depends on previous test");
    const res = await apiPost(`/clerk/classes/${createdClassId}/subjects`, {
      name: "Bio E2E",
      subject_code: "bio888",
    }, token);
    expect(res.subject_code).toBe("BIO888");
    // clean up
    if (res.subject_id) await apiDelete(`/clerk/subjects/${res.subject_id}`, token);
  });

  test("delete subject via API", async () => {
    if (!createdSubjectId) test.skip(true, "depends on previous test");
    const res = await apiDelete(`/clerk/subjects/${createdSubjectId}`, token);
    expect(res).toMatchObject({ message: "Deleted" });
  });

  test("delete class via API", async () => {
    if (!createdClassId) test.skip(true, "depends on previous test");
    const res = await apiDelete(`/clerk/classes/${createdClassId}`, token);
    expect(res).toMatchObject({ message: "Deleted" });

    const classes = await apiGet("/clerk/classes", token);
    expect(classes.find(c => c.class_id === createdClassId)).toBeFalsy();
  });
});
