import { expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  E2E_AUTH_COOKIE_NAME,
  E2E_DEFAULT_RETURN_TO,
  E2E_TEST_ROUTE_PATHS,
  type E2ETestUser,
} from "./constants";

export async function resetApp(request: APIRequestContext) {
  const response = await request.get(E2E_TEST_ROUTE_PATHS.reset);
  expect(response.ok()).toBeTruthy();
}

export async function signInAs(
  page: Page,
  user: E2ETestUser,
  returnTo = E2E_DEFAULT_RETURN_TO,
) {
  await page.goto(
    `${E2E_TEST_ROUTE_PATHS.auth}?user=${encodeURIComponent(user)}&returnTo=${encodeURIComponent(returnTo)}`,
  );
  await expect
    .poll(async () => {
      const cookies = await page.context().cookies();
      return (
        cookies.find((cookie) => cookie.name === E2E_AUTH_COOKIE_NAME)?.value ??
        null
      );
    })
    .toBe(user);
}
