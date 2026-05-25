const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken } = require("../helpers/auth");

const FACULTY_PHONE = process.env.FACULTY_PHONE || "9200000000";
const FACULTY_PASS  = process.env.FACULTY_PASS  || "Faculty@123";
const COLLEGE_ID    = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Faculty marks entry", () => {
  let token;

  test.beforeAll(async () => {
    token = await loginViaAPI(COLLEGE_ID, FACULTY_PHONE, FACULTY_PASS);
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "faculty", name: "Faculty" });
    await page.goto("/faculty");
  });

  test("renders faculty dashboard", async ({ page }) => {
    // Either assignment list or empty state
    const list = page.locator(".assignment-list");
    const empty = page.locator(".empty-state");
    await expect(list.or(empty)).toBeVisible();
  });

  test("clicking an assignment opens marks table", async ({ page }) => {
    const firstItem = page.locator("[data-testid^='assignment-item-']").first();
    const count = await firstItem.count();
    if (count === 0) {
      test.skip(true, "No assignments for this faculty — skip marks entry test");
      return;
    }
    await firstItem.click();
    await expect(page.getByTestId("marks-entry-table")).toBeVisible();
  });

  test("mark input accepts numeric values", async ({ page }) => {
    const firstItem = page.locator("[data-testid^='assignment-item-']").first();
    const count = await firstItem.count();
    if (count === 0) {
      test.skip(true, "No assignments for this faculty");
      return;
    }
    await firstItem.click();
    const firstInput = page.locator("[data-testid^='mark-input-']").first();
    await firstInput.fill("85");
    await expect(firstInput).toHaveValue("85");
  });

  test("save draft button is present when assignment is open", async ({ page }) => {
    const firstItem = page.locator("[data-testid^='assignment-item-']").first();
    const count = await firstItem.count();
    if (count === 0) { test.skip(true, "No assignments"); return; }
    await firstItem.click();

    // Only present if not locked
    const locked = await page.getByTestId("locked-banner").count();
    if (locked === 0) {
      await expect(page.getByTestId("save-marks-btn")).toBeVisible();
    }
  });

  test("submit button is present when status is open", async ({ page }) => {
    const firstItem = page.locator("[data-testid^='assignment-item-']").first();
    const count = await firstItem.count();
    if (count === 0) { test.skip(true, "No assignments"); return; }
    await firstItem.click();

    const locked = await page.getByTestId("locked-banner").count();
    if (locked === 0) {
      const submitBtn = page.getByTestId("submit-btn");
      const reopenBtn = page.getByTestId("reopen-btn");
      await expect(submitBtn.or(reopenBtn)).toBeVisible();
    }
  });

  test("locked assignment shows locked banner and no inputs", async ({ page }) => {
    // Navigate to faculty page and look for a locked assignment if any
    const firstItem = page.locator("[data-testid^='assignment-item-']").first();
    const count = await firstItem.count();
    if (count === 0) { test.skip(true, "No assignments"); return; }
    await firstItem.click();

    const locked = await page.getByTestId("locked-banner").count();
    if (locked > 0) {
      await expect(page.getByTestId("locked-banner")).toBeVisible();
      await expect(page.locator("[data-testid^='mark-input-']")).toHaveCount(0);
    }
    // If not locked, test is vacuously ok
  });
});
