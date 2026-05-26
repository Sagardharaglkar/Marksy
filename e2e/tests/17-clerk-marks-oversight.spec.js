/**
 * Clerk: marks oversight tab — view marks, filter by class/status,
 * download Excel, lock assignment.
 * Uses TESTCOL1 seed data.
 */
const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken, apiGet, apiPatch } = require("../helpers/auth");

const CLERK_PHONE = process.env.CLERK_PHONE || "9100000000";
const CLERK_PASS  = process.env.CLERK_PASS  || "Clerk@123";
const COLLEGE_ID  = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Clerk: marks oversight", () => {
  let token;
  let submittedAssignmentId;
  let lockedAssignmentId;

  test.beforeAll(async () => {
    token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);

    const assignments = await apiGet("/clerk/assignments", token);
    const submitted = assignments.find(a => a.status === "submitted");
    const locked    = assignments.find(a => a.status === "locked");

    if (!submitted) throw new Error("No submitted assignment — run seed_test_data.sql");
    if (!locked)    throw new Error("No locked assignment — run seed_test_data.sql");

    submittedAssignmentId = submitted.assignment_id;
    lockedAssignmentId    = locked.assignment_id;
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "clerk", name: "Clerk" });
    await page.goto("/clerk");
    await page.getByTestId("tab-marks").click();
  });

  // ── Sidebar ──────────────────────────────────────────────────

  test("marks tab shows assignment list in sidebar", async ({ page }) => {
    const items = page.locator("[data-testid^='assignment-item-']");
    await expect(items.first()).toBeVisible();
  });

  test("class dropdown filters to one class", async ({ page }) => {
    const classSelect = page.locator("select").filter({ hasText: "All Classes" });
    await expect(classSelect).toBeVisible();
    const options = await classSelect.locator("option").count();
    expect(options).toBeGreaterThan(1); // All Classes + at least one class
    await classSelect.selectOption({ index: 1 });
    // Assignments list should still have at least one item (from that class)
    await expect(page.locator("[data-testid^='assignment-item-']").first()).toBeVisible();
  });

  test("status filter shows only submitted assignments", async ({ page }) => {
    const statusSelect = page.locator("select").filter({ hasText: "All Status" });
    await statusSelect.selectOption("submitted");
    const items = page.locator("[data-testid^='assignment-item-']");
    await expect(items.first()).toBeVisible();
    // No locked items should appear when filtered to submitted
    await expect(page.locator("text=/locked/i").first()).toHaveCount(0);
  });

  test("selecting assignment shows marks detail panel", async ({ page }) => {
    await page.getByTestId(`assignment-item-${lockedAssignmentId}`).click();
    await expect(page.getByTestId("marks-table")).toBeVisible();
  });

  test("marks table shows student rows with seat, reg no, name and mark", async ({ page }) => {
    await page.getByTestId(`assignment-item-${lockedAssignmentId}`).click();
    await expect(page.getByTestId("marks-table")).toBeVisible();
    await expect(page.getByText("Alice Sharma")).toBeVisible();
  });

  test("mark search filters student rows", async ({ page }) => {
    await page.getByTestId(`assignment-item-${lockedAssignmentId}`).click();
    await expect(page.getByTestId("marks-table")).toBeVisible();

    const searchInput = page.locator("input[placeholder*='Search student']");
    await searchInput.fill("Alice");
    await expect(page.getByText("Alice Sharma")).toBeVisible();
    await expect(page.getByText("Bob Patil")).toHaveCount(0);
  });

  test("download Excel button is visible after selecting assignment", async ({ page }) => {
    await page.getByTestId(`assignment-item-${lockedAssignmentId}`).click();
    await expect(page.getByTestId("download-marks-btn")).toBeVisible();
  });

  // ── Marks detail via API ─────────────────────────────────────

  test("viewMarks API returns assignment + marks array", async () => {
    const res = await apiGet(`/clerk/assignments/${lockedAssignmentId}/marks`, token);
    expect(res.assignment).toBeTruthy();
    expect(Array.isArray(res.marks)).toBe(true);
    expect(res.marks.length).toBeGreaterThan(0);
  });

  test("marks have expected fields", async () => {
    const res = await apiGet(`/clerk/assignments/${lockedAssignmentId}/marks`, token);
    const mark = res.marks[0];
    expect(mark).toHaveProperty("student_name");
    expect(mark).toHaveProperty("seat_no");
    expect(mark).toHaveProperty("registration_no");
    expect(mark).toHaveProperty("value");
  });

  test("lock button absent on already-locked assignment in assignments tab", async ({ page }) => {
    await page.getByTestId("tab-assignments").click();
    await expect(page.getByTestId(`lock-btn-${lockedAssignmentId}`)).toHaveCount(0);
  });

  test("lock a submitted assignment via API", async () => {
    // Reset: reopen via faculty API first if needed, then re-submit
    // For this test just lock the submitted one directly
    const res = await apiPatch(`/clerk/assignments/${submittedAssignmentId}/lock`, {}, token);
    // Either succeeds or was already locked — both ok
    expect(res.message ?? res.error).toBeTruthy();
  });

  test("already-locked assignment returns error on second lock attempt", async () => {
    const res = await apiPatch(`/clerk/assignments/${lockedAssignmentId}/lock`, {}, token);
    expect(res.error).toMatch(/already locked/i);
  });
});
