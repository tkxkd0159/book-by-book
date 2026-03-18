import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/test";
import { E2E_ROUTE_PATHS, E2E_URL_PATTERNS } from "./helpers/constants";
import { resetApp, signInAs } from "./helpers/auth";

function shelfPathFromUrl(url: string) {
  return new URL(url).pathname;
}

function shelfVisibilityBadge(page: Page, label: "Public" | "Private") {
  return page.locator("span").filter({ hasText: new RegExp(`^${label}$`) }).first();
}

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

test("owner can create, update, list, and delete a shelf", async ({ page }) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.meShelvesNew);

  await expect(page.getByRole("heading", { name: "Create a shelf" })).toBeVisible();
  await page.getByLabel("Name").fill("Weekend Favorites");
  await page.getByLabel("Description").fill("Books to revisit on quiet weekends.");
  await page.getByLabel("Visibility").selectOption("false");
  await page.getByRole("button", { name: "Create shelf" }).click();

  await expect(page).toHaveURL(E2E_URL_PATTERNS.myShelfDetail);
  await expect(page.getByText("Shelf created.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weekend Favorites" }),
  ).toBeVisible();
  await expect(shelfVisibilityBadge(page, "Private")).toBeVisible();

  const shelfPath = shelfPathFromUrl(page.url());

  await page.goto(E2E_ROUTE_PATHS.meShelves);
  await expect(page.getByRole("heading", { name: "My shelves" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weekend Favorites" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Weekend Favorites" })).toBeVisible();

  await page.goto(shelfPath);
  await page.getByLabel("Name").fill("Weekend Classics");
  await page.getByLabel("Description").fill("Public rereads worth returning to.");
  await page.getByLabel("Visibility").selectOption("true");
  await page.getByRole("button", { name: "Save shelf" }).click();

  await expect(page).toHaveURL(E2E_URL_PATTERNS.myShelfDetail);
  await expect(page.getByText("Shelf updated.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weekend Classics" })).toBeVisible();
  await expect(shelfVisibilityBadge(page, "Public")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open public view" })).toBeVisible();

  await page.getByRole("button", { name: "Delete shelf" }).click();
  await page.getByRole("button", { name: "Yes, delete shelf" }).click();

  await expect(page).toHaveURL(/\/me\/shelves\?message=/i);
  await expect(page.getByText("Shelf deleted.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "My shelves" })).toBeVisible();
  await expect(page.getByText("No shelves yet")).toBeVisible();
});

test("signed-in readers can open public shelves, private shelves stay forbidden, and wrong owner paths 404", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.meShelvesNew);

  await page.getByLabel("Name").fill("Shared Shelf");
  await page.getByLabel("Description").fill("Visible to signed-in readers.");
  await page.getByLabel("Visibility").selectOption("true");
  await page.getByRole("button", { name: "Create shelf" }).click();

  await expect(page).toHaveURL(E2E_URL_PATTERNS.myShelfDetail);
  const ownerShelfPath = shelfPathFromUrl(page.url());
  const publicShelfHref = await page
    .getByRole("link", { name: "Open public view" })
    .getAttribute("href");

  expect(publicShelfHref).toBeTruthy();

  await signInAs(page, "member", E2E_ROUTE_PATHS.me);
  await page.goto(publicShelfHref!);

  await expect(page).toHaveURL(E2E_URL_PATTERNS.publicShelf);
  await expect(page.getByRole("heading", { name: "Shared Shelf" })).toBeVisible();
  await expect(page.getByText("Shared by Owner Reader.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete shelf" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save shelf" })).toHaveCount(0);
  await expect(page.getByText("Edit shelf")).toHaveCount(0);

  const wrongOwnerHref = publicShelfHref!.replace(
    /\/users\/[^/]+\//,
    "/users/00000000-0000-0000-0000-000000000000/",
  );
  const missingOwnerResponse = await page.goto(wrongOwnerHref);
  expect(missingOwnerResponse?.status()).toBe(404);
  await expect(page.locator("body")).toContainText("404");

  await signInAs(page, "owner", ownerShelfPath);
  await page.getByLabel("Visibility").selectOption("false");
  await page.getByRole("button", { name: "Save shelf" }).click();
  await expect(page.getByText("Shelf updated.")).toBeVisible();
  await expect(shelfVisibilityBadge(page, "Private")).toBeVisible();

  await signInAs(page, "member", E2E_ROUTE_PATHS.me);
  const forbiddenResponse = await page.goto(publicShelfHref!);
  expect(forbiddenResponse?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
});
