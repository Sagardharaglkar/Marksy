const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken } = require("../helpers/auth");

const CLERK_PHONE = process.env.CLERK_PHONE || "9100000000";
const CLERK_PASS  = process.env.CLERK_PASS  || "Clerk@123";
const COLLEGE_ID  = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Clerk marks oversight", () => {
  let token;

  test.beforeAll(async () => {
    token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "clerk", name: "Clerk" });
    await page.goto("/clerk");
    await page.getByTestId("tab-marks").click();
  });

  test("renders marks oversight tab", async ({ page }) => {
    await expect(page.locator(".marks-oversight")).toBeVisible();
  });

  test("clicking an assignment shows marks detail", async ({ page }) => {
    const firstItem = page.locator("[data-testid^='assignment-item-']").first();
    const count = await firstItem.count();
    if (count === 0) {
      test.skip(true, "No assignments yet");
      return;
    }
    await firstItem.click();
    await expect(page.getByTestId("marks-table")).toBeVisible();
  });

  test("download CSV button is present after selecting assignment", async ({ page }) => {
    const firstItem = page.locator("[data-testid^='assignment-item-']").first();
    const count = await firstItem.count();
    if (count === 0) { test.skip(true, "No assignments yet"); return; }
    await firstItem.click();
    await expect(page.getByTestId("download-marks-btn")).toBeVisible();
  });

  test("lock button is present on unlocked assignment", async ({ page }) => {
    await page.getByTestId("tab-assignments").click();
    const lockBtns = page.locator("[data-testid^='lock-btn-']");
    const count = await lockBtns.count();
    if (count === 0) {
      test.skip(true, "No unlocked assignments");
      return;
    }
    await expect(lockBtns.first()).toBeVisible();
  });
});
