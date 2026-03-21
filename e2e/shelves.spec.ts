import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/test";
import { E2E_ROUTE_PATHS, E2E_URL_PATTERNS } from "./helpers/constants";
import { resetApp, signInAs } from "./helpers/auth";
import { seedShelfBook } from "./helpers/test-data";

function shelfPathFromUrl(url: string) {
  return new URL(url).pathname;
}

function shelfIdFromUrl(url: string) {
  const shelfId = shelfPathFromUrl(url).split("/").at(-1);
  if (!shelfId) {
    throw new Error(`Unable to read shelf id from ${url}`);
  }

  return shelfId;
}

function clubManageBoardPathFromUrl(url: string) {
  return `${shelfPathFromUrl(url).replace(/\/board$/, "")}/manage/board`;
}

function wantToReadSection(page: Page) {
  return page
    .locator("section")
    .filter({
      has: page.getByRole("heading", {
        name: "Want to Read",
        exact: true,
      }),
    })
    .first();
}

async function waitForWantToReadBook(page: Page, title: string) {
  await expect(wantToReadSection(page).getByText(title)).toBeVisible({
    timeout: 20_000,
  });
}

function shelfVisibilityBadge(page: Page, label: "Public" | "Private") {
  return page
    .locator("span")
    .filter({ hasText: new RegExp(`^${label}$`) })
    .first();
}

async function createShelf(
  page: Page,
  name: string,
  visibility: "true" | "false" = "false",
) {
  await page.goto(E2E_ROUTE_PATHS.meShelvesNew);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Description").fill(`${name} description`);
  await page.getByLabel("Visibility").selectOption(visibility);
  await page.getByRole("button", { name: "Create shelf" }).click();
  await expect(page).toHaveURL(E2E_URL_PATTERNS.myShelfDetail);
  return page.url();
}

async function createClub(page: Page, name: string) {
  await page.goto(E2E_ROUTE_PATHS.clubsNew);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Description").fill(`${name} description`);
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();
  await expect(page).toHaveURL(E2E_URL_PATTERNS.clubDetail);
  return page.url();
}

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

test("owner can create, update, list, and delete a shelf", async ({ page }) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.meShelvesNew);

  await expect(
    page.getByRole("heading", { name: "Create a shelf" }),
  ).toBeVisible();
  await page.getByLabel("Name").fill("Weekend Favorites");
  await page
    .getByLabel("Description")
    .fill("Books to revisit on quiet weekends.");
  await page.getByLabel("Visibility").selectOption("false");
  await page.getByRole("button", { name: "Create shelf" }).click();

  await expect(page).toHaveURL(E2E_URL_PATTERNS.myShelfDetail);
  await expect(page.getByText("Shelf created.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weekend Favorites" }),
  ).toBeVisible();
  await expect(shelfVisibilityBadge(page, "Private")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);

  const shelfPath = shelfPathFromUrl(page.url());

  await page.goto(E2E_ROUTE_PATHS.meShelves);
  await expect(page.getByRole("heading", { name: "My shelves" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weekend Favorites" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Weekend Favorites" }),
  ).toBeVisible();

  await page.goto(shelfPath);
  await page.getByRole("button", { name: "Edit shelf" }).click();
  await page.getByLabel("Name").fill("Weekend Classics");
  await page
    .getByLabel("Description")
    .fill("Public rereads worth returning to.");
  await page.getByLabel("Visibility").selectOption("true");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page).toHaveURL(E2E_URL_PATTERNS.myShelfDetail);
  await expect(
    page.getByRole("heading", { name: "Weekend Classics" }),
  ).toBeVisible();
  await expect(shelfVisibilityBadge(page, "Public")).toBeVisible();
  await page.getByRole("button", { name: "Edit shelf" }).click();
  await expect(
    page.getByRole("link", { name: "Open public view" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Delete shelf" }).click();
  const deleteDialog = page.getByRole("dialog");
  await expect(
    deleteDialog.getByRole("button", { name: "Delete this shelf" }),
  ).toBeDisabled();
  await deleteDialog.getByLabel("Confirm shelf name").fill("Weekend Favorites");
  await expect(
    deleteDialog.getByRole("button", { name: "Delete this shelf" }),
  ).toBeDisabled();
  await deleteDialog.getByLabel("Confirm shelf name").fill("Weekend Classics");
  await deleteDialog.getByRole("button", { name: "Delete this shelf" }).click();

  await expect(page).toHaveURL(/\/me\/shelves\?message=/i);
  await expect(page.getByText("Shelf deleted.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "My shelves" })).toBeVisible();
  await expect(page.getByText("No shelves yet")).toBeVisible();
});

test("signed-in readers can open public shelves, private shelves stay forbidden, and wrong owner paths 404", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.meShelvesNew);
  const ownerShelfPath = shelfPathFromUrl(
    await createShelf(page, "Shared Shelf", "true"),
  );
  await page.getByRole("button", { name: "Edit shelf" }).click();
  const publicShelfHref = await page
    .getByRole("link", { name: "Open public view" })
    .getAttribute("href");

  expect(publicShelfHref).toBeTruthy();

  await signInAs(page, "member", E2E_ROUTE_PATHS.me);
  await page.goto(publicShelfHref!);

  await expect(page).toHaveURL(E2E_URL_PATTERNS.publicShelf);
  await expect(page).toHaveURL(/\/users\/owner-reader\/shelves\/[0-9a-f-]+(?:\?|$)/i);
  await expect(
    page.getByRole("heading", { name: "Shared Shelf" }),
  ).toBeVisible();
  await expect(
    page.getByText("owner-reader's notes and titles, in read-only mode."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete shelf" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(page.getByText("Edit shelf")).toHaveCount(0);

  const wrongOwnerHref = publicShelfHref!.replace(
    /\/users\/[^/]+\//,
    "/users/missing-reader/",
  );
  const missingOwnerResponse = await page.goto(wrongOwnerHref);
  expect(missingOwnerResponse?.status()).toBe(404);
  await expect(page.locator("body")).toContainText("404");

  await signInAs(page, "owner", ownerShelfPath);
  await page.getByRole("button", { name: "Edit shelf" }).click();
  await page.getByLabel("Visibility").selectOption("false");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(shelfVisibilityBadge(page, "Private")).toBeVisible();

  await signInAs(page, "member", E2E_ROUTE_PATHS.me);
  const forbiddenResponse = await page.goto(publicShelfHref!);
  expect(forbiddenResponse?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
});

test("owner can save notes, public readers can read them, and owner can remove shelf books", async ({
  page,
  request,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.meShelvesNew);
  const ownerShelfUrl = await createShelf(page, "Annotated Shelf", "true");
  await seedShelfBook(request, {
    shelfId: shelfIdFromUrl(ownerShelfUrl),
  });

  await page.goto(ownerShelfUrl);
  await expect(page.getByRole("button", { name: "Open book" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "The Test-Driven Book Club" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove book" })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", {
      name: "Edit shelf item for The Test-Driven Book Club",
    })
    .click();
  await expect(page.getByLabel("Note")).toBeVisible();
  await page
    .getByRole("button", {
      name: "Cancel shelf item edit for The Test-Driven Book Club",
    })
    .click();
  await expect(page.getByLabel("Note")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Edit shelf item for The Test-Driven Book Club",
    })
    .click();
  await page
    .getByLabel("Note")
    .fill("Discuss this chapter order at the next meetup.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Shelf note saved.")).toBeVisible();

  await page.getByRole("button", { name: "Edit shelf", exact: true }).click();
  const publicShelfHref = await page
    .getByRole("link", { name: "Open public view" })
    .getAttribute("href");
  expect(publicShelfHref).toBeTruthy();

  await signInAs(page, "member", E2E_ROUTE_PATHS.me);
  await page.goto(publicShelfHref!);
  await expect(
    page.getByText("Discuss this chapter order at the next meetup."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save note" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Remove book" })).toHaveCount(
    0,
  );

  await signInAs(page, "owner", ownerShelfUrl);
  await page
    .getByRole("button", {
      name: "Remove The Test-Driven Book Club from shelf",
    })
    .click();
  await expect(page.getByText("Book removed from shelf.")).toBeVisible();
  await expect(page.getByText("No books on this shelf yet.")).toBeVisible();
});

test("reading board management can import books from shelves into Want to Read", async ({
  page,
  request,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.meShelvesNew);
  const ownerShelfUrl = await createShelf(page, "Board Import Shelf");
  await seedShelfBook(request, {
    shelfId: shelfIdFromUrl(ownerShelfUrl),
  });

  const clubUrl = await createClub(page, "Shelf Import Club");
  const manageBoardUrl = clubManageBoardPathFromUrl(clubUrl);

  await page.goto(manageBoardUrl);
  await expect(
    page.getByRole("heading", { name: "Reading board management" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add from shelves" }).click();

  const importDialog = page.getByRole("dialog");
  await importDialog.getByLabel("The Test-Driven Book Club").check();
  await importDialog
    .getByRole("button", { name: "Add to Want to Read" })
    .click();

  await waitForWantToReadBook(page, "The Test-Driven Book Club");

  await page.getByRole("button", { name: "Add from shelves" }).click();
  await expect(
    importDialog.getByText(
      "Every book from this shelf is already active in the club, or the shelf has no books yet.",
    ),
  ).toBeVisible();
});
