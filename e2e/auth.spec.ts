import { expect, test } from "@playwright/test";

import { resetApp, signInAs } from "./helpers/auth";

const E2E_AUTH_COOKIE_NAME = "bbb_e2e_user";

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

test("signed-out users are redirected from protected pages before the shell renders", async ({
  page,
}) => {
  await page.goto("/clubs");

  await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fclubs$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to Book by Book" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Book Clubs" })).toHaveCount(0);
});

test("stale optimistic auth cookies do not block access to the sign-in page", async ({
  page,
}) => {
  await page.context().addCookies([
    {
      name: E2E_AUTH_COOKIE_NAME,
      value: "ghost-user",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("/signin");

  await expect(page).toHaveURL(/\/signin$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to Book by Book" }),
  ).toBeVisible();
});

test("valid signed-in users can still reach protected pages through the proxy gate", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs");

  await expect(page).toHaveURL(/\/clubs$/);
  await expect(page.getByRole("heading", { name: "Book Clubs" })).toBeVisible();
});
