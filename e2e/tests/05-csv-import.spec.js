const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken } = require("../helpers/auth");

const CLERK_PHONE = process.env.CLERK_PHONE || "9100000000";
const CLERK_PASS  = process.env.CLERK_PASS  || "Clerk@123";
const COLLEGE_ID  = parseInt(process.env.COLLEGE_ID || "1");

const VALID_CSV = `seat_no,registration_no,name
S001,R001,Alice Sharma
S002,R002,Bob Patil
S003,R003,Carol Desai`;

const BAD_CSV_MISSING_FIELD = `seat_no,registration_no,name
S001,,Alice Sharma`;

const BAD_CSV_DUPLICATE = `seat_no,registration_no,name
S010,R010,Duplicate One
S010,R011,Duplicate Two`;

test.describe("Student CSV import", () => {
  let token;

  test.beforeAll(async () => {
    token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "clerk", name: "Clerk" });
    await page.goto("/clerk");
    // Open students modal for the first class
    const firstStudentsBtn = page.locator("[data-testid^='students-btn-']").first();
    await firstStudentsBtn.click();
    await expect(page.getByTestId("students-modal")).toBeVisible();
  });

  test("imports valid CSV successfully", async ({ page }) => {
    await page.getByTestId("csv-textarea").fill(VALID_CSV);
    await page.getByTestId("csv-import-btn").click();
    await expect(page.locator(".success-msg")).toBeVisible();
    await expect(page.locator(".success-msg")).toContainText("Imported");
  });

  test("shows row-level error for missing registration_no", async ({ page }) => {
    await page.getByTestId("csv-textarea").fill(BAD_CSV_MISSING_FIELD);
    await page.getByTestId("csv-import-btn").click();
    await expect(page.locator(".csv-error")).toBeVisible();
    await expect(page.locator(".csv-error")).toContainText("registration_no");
  });

  test("shows error for duplicate seat_no in CSV", async ({ page }) => {
    await page.getByTestId("csv-textarea").fill(BAD_CSV_DUPLICATE);
    await page.getByTestId("csv-import-btn").click();
    await expect(page.locator(".csv-error")).toBeVisible();
    await expect(page.locator(".csv-error")).toContainText("Duplicate");
  });

  test("shows error when CSV textarea is empty", async ({ page }) => {
    await page.getByTestId("csv-import-btn").click();
    await expect(page.locator(".csv-error")).toBeVisible();
  });
});
