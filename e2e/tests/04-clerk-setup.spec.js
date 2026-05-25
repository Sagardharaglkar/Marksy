const { test, expect } = require("@playwright/test");
const { loginViaAPI, injectToken } = require("../helpers/auth");

const CLERK_PHONE = process.env.CLERK_PHONE || "9100000000";
const CLERK_PASS  = process.env.CLERK_PASS  || "Clerk@123";
const COLLEGE_ID  = parseInt(process.env.COLLEGE_ID || "1");

test.describe("Clerk setup", () => {
  let token;

  test.beforeAll(async () => {
    token = await loginViaAPI(COLLEGE_ID, CLERK_PHONE, CLERK_PASS);
  });

  test.beforeEach(async ({ page }) => {
    await injectToken(page, token, { role: "clerk", name: "Clerk" });
    await page.goto("/clerk");
  });

  test("renders clerk dashboard with tabs", async ({ page }) => {
    await expect(page.getByTestId("tab-classes")).toBeVisible();
    await expect(page.getByTestId("tab-faculty")).toBeVisible();
    await expect(page.getByTestId("tab-assignments")).toBeVisible();
    await expect(page.getByTestId("tab-marks")).toBeVisible();
  });

  test("creates a new class", async ({ page }) => {
    await page.getByTestId("add-class-btn").click();
    await expect(page.getByTestId("class-modal")).toBeVisible();
    await page.getByTestId("class-name-input").fill("E2E Test Class");
    await page.getByTestId("class-submit").click();
    await expect(page.getByTestId("classes-table")).toBeVisible();
    await expect(page.getByText("E2E Test Class")).toBeVisible();
  });

  test("shows error when class name is empty", async ({ page }) => {
    await page.getByTestId("add-class-btn").click();
    await page.getByTestId("class-submit").click();
    await expect(page.locator(".form-error")).toBeVisible();
  });

  test("creates a faculty account", async ({ page }) => {
    await page.getByTestId("tab-faculty").click();
    await page.getByTestId("add-faculty-btn").click();
    await expect(page.getByTestId("faculty-modal")).toBeVisible();
    await page.getByTestId("faculty-name-input").fill("Test Faculty E2E");
    await page.getByTestId("faculty-phone-input").fill("9800000001");
    await page.getByTestId("faculty-password-input").fill("Faculty@123");
    await page.getByTestId("faculty-submit").click();
    await expect(page.getByTestId("faculty-table")).toBeVisible();
    await expect(page.getByText("Test Faculty E2E")).toBeVisible();
  });

  test("opens subjects modal for a class", async ({ page }) => {
    // Assumes at least one class exists
    const firstSubjectsBtn = page.locator("[data-testid^='subjects-btn-']").first();
    await firstSubjectsBtn.click();
    await expect(page.getByTestId("subjects-modal")).toBeVisible();
  });

  test("opens students modal for a class", async ({ page }) => {
    const firstStudentsBtn = page.locator("[data-testid^='students-btn-']").first();
    await firstStudentsBtn.click();
    await expect(page.getByTestId("students-modal")).toBeVisible();
  });
});
