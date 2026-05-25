const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken, apiPost, apiGet, apiPatch } = require("../helpers/auth");

/**
 * State machine flow test: open → submit → lock
 * This test hits the API directly for setup/teardown and uses the UI
 * only for the steps it verifies visually.
 *
 * Requires:
 *   - A clerk account (CLERK_PHONE / CLERK_PASS)
 *   - A faculty account (FACULTY_PHONE / FACULTY_PASS)
 *   - An existing assignment assigned to that faculty (ASSIGNMENT_ID env var)
 */

const CLERK_PHONE   = process.env.CLERK_PHONE   || "9100000000";
const CLERK_PASS    = process.env.CLERK_PASS    || "Clerk@123";
const FACULTY_PHONE = process.env.FACULTY_PHONE || "9200000000";
const FACULTY_PASS  = process.env.FACULTY_PASS  || "Faculty@123";
const COLLEGE_ID    = parseInt(process.env.COLLEGE_ID || "1");
const ASSIGNMENT_ID = process.env.ASSIGNMENT_ID;

test.describe("Assignment state machine", () => {
  test.skip(!ASSIGNMENT_ID, "Set ASSIGNMENT_ID env var to run state machine tests");

  let clerkToken, facultyToken;

  test.beforeAll(async () => {
    [clerkToken, facultyToken] = await Promise.all([
      loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS),
      loginViaAPI(COLLEGE_ID, FACULTY_PHONE, FACULTY_PASS),
    ]);
    // Reset to open state via direct API call
    await apiPatch(`/faculty/assignments/${ASSIGNMENT_ID}/reopen`, {}, facultyToken)
      .catch(() => {}); // May already be open
  });

  test("faculty can see submit button when status is open", async ({ page }) => {
    await injectToken(page, facultyToken, { role: "faculty", name: "Faculty" });
    await page.goto("/faculty");
    const item = page.getByTestId(`assignment-item-${ASSIGNMENT_ID}`);
    await item.click();
    await expect(page.getByTestId("submit-btn")).toBeVisible();
  });

  test("faculty submits and sees reopen button", async ({ page }) => {
    await injectToken(page, facultyToken, { role: "faculty", name: "Faculty" });
    await page.goto("/faculty");
    const item = page.getByTestId(`assignment-item-${ASSIGNMENT_ID}`);
    await item.click();

    // Submit if still open
    const submitBtn = page.getByTestId("submit-btn");
    if (await submitBtn.count() > 0) {
      page.once("dialog", d => d.accept());
      await submitBtn.click();
    }
    await expect(page.getByTestId("reopen-btn")).toBeVisible();
  });

  test("clerk can lock a submitted assignment", async ({ page }) => {
    await injectToken(page, clerkToken, { role: "clerk", name: "Clerk" });
    await page.goto("/clerk");
    await page.getByTestId("tab-assignments").click();
    const lockBtn = page.getByTestId(`lock-btn-${ASSIGNMENT_ID}`);
    if (await lockBtn.count() > 0) {
      page.once("dialog", d => d.accept());
      await lockBtn.click();
    }
    // After lock, lock button should disappear
    await expect(page.getByTestId(`lock-btn-${ASSIGNMENT_ID}`)).toHaveCount(0);
  });

  test("faculty sees locked banner after clerk locks", async ({ page }) => {
    await injectToken(page, facultyToken, { role: "faculty", name: "Faculty" });
    await page.goto("/faculty");
    const item = page.getByTestId(`assignment-item-${ASSIGNMENT_ID}`);
    await item.click();
    await expect(page.getByTestId("locked-banner")).toBeVisible();
  });
});
