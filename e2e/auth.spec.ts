import { expect, test } from "./fixtures/test";

import { E2E_AUTH_COOKIE_NAME, E2E_ROUTE_PATHS } from "./helpers/constants";
import { resetApp, signInAs } from "./helpers/auth";

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

test("signed-out users are redirected from protected pages before the shell renders", async ({
  page,
}) => {
  await page.goto(E2E_ROUTE_PATHS.clubs);

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

  await page.goto(E2E_ROUTE_PATHS.signIn);

  await expect(page).toHaveURL(/\/signin$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to Book by Book" }),
  ).toBeVisible();
});

test("valid signed-in users can still reach protected pages through the proxy gate", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubs);

  await expect(page).toHaveURL(/\/clubs$/);
  await expect(page.getByRole("heading", { name: "Book Clubs" })).toBeVisible();
});
