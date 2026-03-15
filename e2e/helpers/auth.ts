import { expect, type APIRequestContext, type Page } from "@playwright/test";

export type E2ETestUser = "owner" | "member" | "stranger";

export async function resetApp(request: APIRequestContext) {
  const response = await request.get("/api/test/reset");
  expect(response.ok()).toBeTruthy();
}

export async function signInAs(
  page: Page,
  user: E2ETestUser,
  returnTo = "/clubs",
) {
  await page.goto(
    `/api/test/auth?user=${encodeURIComponent(user)}&returnTo=${encodeURIComponent(returnTo)}`,
  );
}
