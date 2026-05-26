/**
 * Clerk: assignment CRUD — create, reassign faculty, lock, delete.
 * Uses PHY101 / CHM101 subjects and faculty from TESTCOL1 seed.
 */
const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken, apiPost, apiGet, apiPut, apiDelete, apiPatch } = require("../helpers/auth");

const CLERK_PHONE = process.env.CLERK_PHONE || "9100000000";
const CLERK_PASS  = process.env.CLERK_PASS  || "Clerk@123";
const COLLEGE_ID  = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Clerk: assignment CRUD", () => {
  let token;
  let facultyId;
  let subjectId;   // CHM101 external — not seeded, so safe to create
  let assignmentId;

  test.beforeAll(async () => {
    token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);

    const faculty = await apiGet("/clerk/faculty", token);
    const fac = faculty.find(f => f.phone === "9200000000");
    if (!fac) throw new Error("Test faculty not found — run seed_test_data.sql");
    facultyId = fac.user_id;

    const classes = await apiGet("/clerk/classes", token);
    const cls = classes.find(c => c.name === "FY B.Sc.");
    if (!cls) throw new Error("FY B.Sc. not found — run seed_test_data.sql");

    const subjects = await apiGet(`/clerk/classes/${cls.class_id}/subjects`, token);
    const sub = subjects.find(s => s.subject_code === "CHM101");
    if (!sub) throw new Error("CHM101 not found — run seed_test_data.sql");
    subjectId = sub.subject_id;
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "clerk", name: "Clerk" });
    await page.goto("/clerk");
    await page.getByTestId("tab-assignments").click();
  });

  test("assignments tab renders", async ({ page }) => {
    const table = page.getByTestId("assignments-table");
    const empty = page.locator("text=/No assignments/i");
    await expect(table.or(empty)).toBeVisible();
  });

  test("create assignment via API (CHM101 external)", async () => {
    // CHM101 external doesn't exist in seed — safe to create
    const res = await apiPost("/clerk/assignments", {
      subject_id: subjectId,
      faculty_id: facultyId,
      mark_type: "external",
    }, token);
    expect(res.assignment_id).toBeTruthy();
    assignmentId = res.assignment_id;
  });

  test("new assignment appears in assignments table", async ({ page }) => {
    await expect(page.getByText("Chemistry")).toBeVisible();
  });

  test("duplicate (same subject + mark_type) is rejected", async () => {
    // CHM101 internal already exists from seed
    const res = await apiPost("/clerk/assignments", {
      subject_id: subjectId,
      faculty_id: facultyId,
      mark_type: "internal",
    }, token);
    expect(res.error).toBeTruthy();
  });

  test("invalid mark_type is rejected", async () => {
    const res = await apiPost("/clerk/assignments", {
      subject_id: subjectId,
      faculty_id: facultyId,
      mark_type: "quarterly",
    }, token);
    expect(res.error).toBeTruthy();
  });

  test("reassign faculty via API", async () => {
    if (!assignmentId) test.skip(true, "depends on create test");
    const res = await apiPut(`/clerk/assignments/${assignmentId}`, { faculty_id: facultyId }, token);
    expect(res.ok).toBe(true);
  });

  test("status filter dropdown filters assignments", async ({ page }) => {
    const statusSelect = page.locator("select").filter({ hasText: "All Status" });
    await statusSelect.selectOption("locked");
    await expect(page.getByText("Chemistry").first()).toBeVisible(); // CHM101 internal is locked
    await statusSelect.selectOption("");
  });

  test("lock assignment via API", async () => {
    if (!assignmentId) test.skip(true, "depends on create test");
    const res = await apiPatch(`/clerk/assignments/${assignmentId}/lock`, {}, token);
    expect(res.message).toMatch(/locked/i);
  });

  test("locked assignment cannot be edited", async () => {
    if (!assignmentId) test.skip(true, "depends on create test");
    const res = await apiPut(`/clerk/assignments/${assignmentId}`, { faculty_id: facultyId }, token);
    expect(res.error).toMatch(/locked/i);
  });

  test("locked assignment cannot be deleted", async () => {
    if (!assignmentId) test.skip(true, "depends on create test");
    const res = await apiDelete(`/clerk/assignments/${assignmentId}`, token);
    expect(res.error).toMatch(/locked/i);
  });

  test("lock button disappears from UI after locking", async ({ page }) => {
    if (!assignmentId) test.skip(true, "depends on create test");
    await expect(page.getByTestId(`lock-btn-${assignmentId}`)).toHaveCount(0);
  });
});
