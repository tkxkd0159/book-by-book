import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/test";

import { resetApp, signInAs, signInAsInternalAdmin } from "./helpers/auth";
import {
  E2E_INTERNAL_ADMIN,
  E2E_ROUTE_PATHS,
} from "./helpers/constants";
import { seedInvitationCode } from "./helpers/test-data";

async function fillSignupForm(page: Page, input: {
  countryCode: string;
  gender: "MAN" | "WOMAN" | "NON_BINARY" | "PREFER_NOT_TO_SAY";
  invitationCode: string;
  nickname: string;
}) {
  await page.getByLabel("Nickname").fill(input.nickname);
  await page.getByLabel("Gender").selectOption(input.gender);
  await page.getByLabel("Country").selectOption(input.countryCode);
  await page.getByRole("checkbox", { name: "Fantasy" }).check();
  await page.getByLabel("Invitation code").fill(input.invitationCode);
}

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

test("incomplete readers are redirected to signup and resume their callback after redeeming a valid code", async ({
  page,
  request,
}) => {
  const { rawCode } = await seedInvitationCode(request, {
    label: "Signup Happy Path",
  });

  await signInAs(page, "incomplete", E2E_ROUTE_PATHS.booksSearch);

  await expect(page).toHaveURL(/\/signup\?callbackUrl=%2Fbooks%2Fsearch$/);
  await expect(
    page.getByRole("heading", { name: "Finish your Book by Book signup" }),
  ).toBeVisible();

  await fillSignupForm(page, {
    nickname: "beta-reader",
    gender: "NON_BINARY",
    countryCode: "KR",
    invitationCode: rawCode,
  });
  await page.getByRole("button", { name: "Complete signup" }).click();

  await expect(page).toHaveURL(/\/books\/search$/);

  await page.goto(E2E_ROUTE_PATHS.me);
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "beta-reader" })).toBeVisible();
  await expect(page.getByText("incomplete@book-by-book.test")).toBeVisible();
  await expect(page.getByText("Non Binary")).toBeVisible();
  await expect(page.getByText(/Korea/i)).toBeVisible();
  await expect(page.getByText("Fantasy")).toBeVisible();
  await expect(page.getByText("User ID")).toHaveCount(0);
});

test("signup rejects invalid invitation codes", async ({ page }) => {
  await signInAs(page, "incomplete", E2E_ROUTE_PATHS.clubs);
  await expect(page).toHaveURL(/\/signup\?callbackUrl=%2Fclubs$/);

  await fillSignupForm(page, {
    nickname: "invalid-code-reader",
    gender: "WOMAN",
    countryCode: "US",
    invitationCode: "WRONG-CODE-1234",
  });
  await page.getByRole("button", { name: "Complete signup" }).click();

  await expect(page).toHaveURL(/\/signup\?callbackUrl=%2Fclubs&error=/);
  await expect(page.getByText("Enter a valid beta invitation code.")).toBeVisible();
});

test("signup rejects expired and exhausted invitation codes", async ({
  page,
  request,
}) => {
  const expiredCode = await seedInvitationCode(request, {
    label: "Expired Signup Code",
    expiresAt: "2020-01-01T00:00:00.000Z",
  });
  const exhaustedCode = await seedInvitationCode(request, {
    label: "Exhausted Signup Code",
    maxUses: 1,
    redeemByUsers: ["owner"],
  });

  await signInAs(page, "incomplete", E2E_ROUTE_PATHS.clubs);
  await expect(page).toHaveURL(/\/signup\?callbackUrl=%2Fclubs$/);

  await fillSignupForm(page, {
    nickname: "expired-code-reader",
    gender: "WOMAN",
    countryCode: "US",
    invitationCode: expiredCode.rawCode,
  });
  await page.getByRole("button", { name: "Complete signup" }).click();
  await expect(page.getByText("This invitation code has expired.")).toBeVisible();

  await fillSignupForm(page, {
    nickname: "used-reader",
    gender: "WOMAN",
    countryCode: "US",
    invitationCode: exhaustedCode.rawCode,
  });
  await page.getByRole("button", { name: "Complete signup" }).click();
  await expect(page.getByText("This invitation code has no uses remaining.")).toBeVisible();
});

test("public readers are blocked from admin routes", async ({ page }) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.me);

  const response = await page.goto(E2E_ROUTE_PATHS.adminInvitationCodes);

  expect(response?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
});

test("internal admins can sign in and manage invitation-code activation", async ({
  page,
}) => {
  await signInAsInternalAdmin(page);

  await expect(page).toHaveURL(/\/admin\/invitation-codes$/);
  await expect(
    page.getByRole("heading", { name: "Invitation code control room" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open profile menu" }),
  ).toBeVisible();

  await page.getByLabel("Label").fill("QA Cohort");
  await page.getByLabel("Max uses").fill("2");
  await page.getByRole("button", { name: "Create invitation code" }).click();

  await expect(page.getByText("Copy this code now")).toBeVisible();
  await expect(page.getByRole("heading", { name: "QA Cohort" })).toBeVisible();
  await expect(page.getByText("ACTIVE")).toBeVisible();

  await page.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByRole("button", { name: "Activate" })).toBeVisible();

  await page.getByRole("button", { name: "Activate" }).click();
  await expect(page.getByRole("button", { name: "Deactivate" })).toBeVisible();

  await page.goto(E2E_ROUTE_PATHS.signup);
  await expect(page).toHaveURL(/\/admin\/invitation-codes$/);

  await page.getByRole("button", { name: "Open profile menu" }).click();
  const profileMenu = page.getByRole("menu");
  await expect(profileMenu.getByText(E2E_INTERNAL_ADMIN.email)).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Invitation codes" }),
  ).toBeVisible();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/signin(?:\?|$)/);
});

test("internal admin sign-in throttles repeated failed attempts", async ({
  page,
}) => {
  await page.goto(E2E_ROUTE_PATHS.adminSignIn);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByLabel("Email").fill(E2E_INTERNAL_ADMIN.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in to admin" }).click();
    await expect(
      page.getByText("Sign-in failed. Check the details you provided are correct."),
    ).toBeVisible();
  }

  await page.getByLabel("Email").fill(E2E_INTERNAL_ADMIN.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in to admin" }).click();

  await expect(
    page.getByText(/Sign-in failed\. Check the details you provided are correct\. Try again in about /),
  ).toBeVisible();
});
