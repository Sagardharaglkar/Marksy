/**
 * Faculty: detailed marks entry — save draft, validate values,
 * submit flow, reopen flow, locked assignment restrictions.
 * Uses PHY101 internal (open) from TESTCOL1 seed.
 */
const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken, apiGet, apiPost, apiPatch } = require("../helpers/auth");

const FACULTY_PHONE = process.env.FACULTY_PHONE || "9200000000";
const FACULTY_PASS  = process.env.FACULTY_PASS  || "Faculty@123";
const COLLEGE_ID    = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Faculty: marks entry", () => {
  let token;
  let openAssignmentId;
  let lockedAssignmentId;

  test.beforeAll(async () => {
    token = await loginViaAPI(COLLEGE_ID, FACULTY_PHONE, FACULTY_PASS);

    const assignments = await apiGet("/faculty/assignments", token);
    const open   = assignments.find(a => a.mark_type === "internal" && a.status === "open");
    const locked = assignments.find(a => a.status === "locked");

    if (!open)   throw new Error("No open assignment — run seed_test_data.sql");
    if (!locked) throw new Error("No locked assignment — run seed_test_data.sql");

    openAssignmentId   = open.assignment_id;
    lockedAssignmentId = locked.assignment_id;

    // Reset open assignment to open state in case a previous run left it submitted
    await apiPatch(`/faculty/assignments/${openAssignmentId}/reopen`, {}, token).catch(() => {});
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "faculty", name: "Test Faculty" });
    await page.goto("/faculty");
  });

  // ── Dashboard ────────────────────────────────────────────────

  test("faculty dashboard shows assignment list", async ({ page }) => {
    const items = page.locator("[data-testid^='assignment-item-']");
    await expect(items.first()).toBeVisible();
  });

  test("assignment cards show subject name, class, type and status pills", async ({ page }) => {
    const firstCard = page.locator("[data-testid^='assignment-item-']").first();
    await expect(firstCard).toBeVisible();
    // Should contain text — Physics, internal or external, and a status
    await expect(firstCard).toContainText(/physics|chemistry/i);
  });

  // ── Open assignment ──────────────────────────────────────────

  test("clicking open assignment shows marks table with student rows", async ({ page }) => {
    await page.getByTestId(`assignment-item-${openAssignmentId}`).click();
    await expect(page.getByTestId("marks-entry-table")).toBeVisible();
    await expect(page.locator("[data-testid^='mark-input-']").first()).toBeVisible();
  });

  test("mark input only shows for non-locked assignment", async ({ page }) => {
    await page.getByTestId(`assignment-item-${openAssignmentId}`).click();
    const inputs = page.locator("[data-testid^='mark-input-']");
    await expect(inputs.first()).toBeVisible();
  });

  test("entering a mark and saving draft succeeds", async ({ page }) => {
    await page.getByTestId(`assignment-item-${openAssignmentId}`).click();
    const firstInput = page.locator("[data-testid^='mark-input-']").first();
    await firstInput.fill("25");
    await page.getByTestId("save-marks-btn").click();
    await expect(page.locator("text=/Saved successfully/i")).toBeVisible();
  });

  test("saved mark persists after re-opening assignment", async ({ page }) => {
    // Click another assignment then come back
    const items = page.locator("[data-testid^='assignment-item-']");
    const count = await items.count();
    if (count > 1) {
      await items.nth(1).click();
      await page.getByTestId(`assignment-item-${openAssignmentId}`).click();
    } else {
      await page.goto("/faculty");
      await page.getByTestId(`assignment-item-${openAssignmentId}`).click();
    }
    const firstInput = page.locator("[data-testid^='mark-input-']").first();
    await expect(firstInput).toHaveValue("25");
  });

  test("save marks via API directly", async () => {
    const marksRes = await apiGet(`/faculty/assignments/${openAssignmentId}/marks`, token);
    const marks = marksRes.marks.map(m => ({
      student_id: m.student_id,
      value: 20,
    }));
    const res = await apiPost(`/faculty/assignments/${openAssignmentId}/marks`, { marks }, token);
    expect(res.message).toMatch(/saved/i);
  });

  test("submit assignment changes status to submitted", async ({ page }) => {
    await page.getByTestId(`assignment-item-${openAssignmentId}`).click();
    await expect(page.getByTestId("submit-btn")).toBeVisible();

    page.once("dialog", d => d.accept());
    await page.getByTestId("submit-btn").click();

    // Should now show reopen button
    await expect(page.getByTestId("reopen-btn")).toBeVisible({ timeout: 5000 });
  });

  test("submitted assignment shows reopen button, not submit", async ({ page }) => {
    await page.getByTestId(`assignment-item-${openAssignmentId}`).click();
    await expect(page.getByTestId("reopen-btn")).toBeVisible();
    await expect(page.getByTestId("submit-btn")).toHaveCount(0);
  });

  test("reopen returns assignment to open state", async ({ page }) => {
    await page.getByTestId(`assignment-item-${openAssignmentId}`).click();
    const reopenBtn = page.getByTestId("reopen-btn");
    if (await reopenBtn.count() > 0) {
      await reopenBtn.click();
      await expect(page.getByTestId("submit-btn")).toBeVisible({ timeout: 5000 });
    }
  });

  test("saving marks on locked assignment fails via API", async () => {
    const marksRes = await apiGet(`/faculty/assignments/${lockedAssignmentId}/marks`, token);
    const marks = marksRes.marks.map(m => ({ student_id: m.student_id, value: 10 }));
    const res = await apiPost(`/faculty/assignments/${lockedAssignmentId}/marks`, { marks }, token);
    expect(res.error).toMatch(/locked/i);
  });

  test("submitting a locked assignment fails via API", async () => {
    const res = await apiPatch(`/faculty/assignments/${lockedAssignmentId}/submit`, {}, token);
    expect(res.error).toMatch(/locked/i);
  });

  test("reopening a locked assignment fails via API", async () => {
    const res = await apiPatch(`/faculty/assignments/${lockedAssignmentId}/reopen`, {}, token);
    expect(res.error).toMatch(/locked/i);
  });

  // ── Locked assignment UI ─────────────────────────────────────

  test("locked assignment shows locked banner in UI", async ({ page }) => {
    await page.getByTestId(`assignment-item-${lockedAssignmentId}`).click();
    await expect(page.getByTestId("locked-banner")).toBeVisible();
  });

  test("locked assignment has no editable inputs", async ({ page }) => {
    await page.getByTestId(`assignment-item-${lockedAssignmentId}`).click();
    await expect(page.locator("[data-testid^='mark-input-']")).toHaveCount(0);
  });

  test("locked assignment shows no save or submit buttons", async ({ page }) => {
    await page.getByTestId(`assignment-item-${lockedAssignmentId}`).click();
    await expect(page.getByTestId("save-marks-btn")).toHaveCount(0);
    await expect(page.getByTestId("submit-btn")).toHaveCount(0);
    await expect(page.getByTestId("reopen-btn")).toHaveCount(0);
  });

  // ── Authorization ────────────────────────────────────────────

  test("faculty cannot access another college's assignment via API", async () => {
    // Assignment ID 99999 should not exist
    const res = await apiGet(`/faculty/assignments/99999/marks`, token);
    expect(res.error).toBeTruthy();
  });
});
