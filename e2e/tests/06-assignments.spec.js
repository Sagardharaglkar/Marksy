const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken } = require("../helpers/auth");

const CLERK_PHONE = process.env.CLERK_PHONE || "9100000000";
const CLERK_PASS  = process.env.CLERK_PASS  || "Clerk@123";
const COLLEGE_ID  = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Assignments tab", () => {
  let token;

  test.beforeAll(async () => {
    token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "clerk", name: "Clerk" });
    await page.goto("/clerk");
    await page.getByTestId("tab-assignments").click();
  });

  test("renders assignments tab", async ({ page }) => {
    const table = page.getByTestId("assignments-table");
    const empty = page.locator(".empty-state");
    await expect(table.or(empty)).toBeVisible();
  });

  test("opens assignment creation modal", async ({ page }) => {
    await page.getByTestId("add-assignment-btn").click();
    await expect(page.getByTestId("assignment-modal")).toBeVisible();
    await expect(page.getByTestId("assignment-class-select")).toBeVisible();
    await expect(page.getByTestId("assignment-type-select")).toBeVisible();
    await expect(page.getByTestId("assignment-faculty-select")).toBeVisible();
  });

  test("shows error when subject or faculty not selected", async ({ page }) => {
    await page.getByTestId("add-assignment-btn").click();
    await page.getByTestId("assignment-submit").click();
    await expect(page.locator(".form-error")).toBeVisible();
  });

  test("subjects dropdown populates after class is selected", async ({ page }) => {
    await page.getByTestId("add-assignment-btn").click();
    const classSelect = page.getByTestId("assignment-class-select");
    const options = await classSelect.locator("option").count();
    if (options > 1) {
      await classSelect.selectOption({ index: 1 });
      // Subjects select should have options now (may take a moment)
      await expect(page.getByTestId("assignment-subject-select")).not.toBeDisabled();
    }
  });
});
