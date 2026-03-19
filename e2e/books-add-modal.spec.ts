import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/test";
import { E2E_ROUTE_PATHS, E2E_URL_PATTERNS } from "./helpers/constants";
import { resetApp, signInAs } from "./helpers/auth";

const FIXTURE_BOOK_URL = E2E_ROUTE_PATHS.fixtureBook;
const CLUB_DETAIL_URL_PATTERN = E2E_URL_PATTERNS.clubDetail;
const SEARCH_RESULTS_URL = E2E_ROUTE_PATHS.searchResults;

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

async function createClub(page: Page, name: string) {
  await page.goto(E2E_ROUTE_PATHS.clubsNew);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Description").fill(`${name} description`);
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();
  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  return page.url();
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

test("combined add-book modal shows clubs and shelves empty states when the user manages neither", async ({
  page,
}) => {
  await signInAs(page, "stranger", FIXTURE_BOOK_URL);

  await page.getByRole("button", { name: "Add Book" }).click();

  const dialog = page.getByRole("dialog");
  await expect(page.locator('body > [data-modal-root="book-add"]')).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(
      "You need a club where you are an owner or admin before you can add books.",
    ),
  ).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Go to clubs" })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Add to clubs" }),
  ).toBeDisabled();

  await dialog.getByRole("tab", { name: /^Shelves/ }).click();
  await expect(
    dialog.getByText(
      "Create a shelf before you can organize books into personal lists.",
    ),
  ).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Create a shelf" })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Add to shelves" }),
  ).toBeDisabled();
});

test("book detail can add a book to multiple clubs from the Clubs tab", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);

  const firstClubUrl = await createClub(page, "Modal Club One");
  const secondClubUrl = await createClub(page, "Modal Club Two");

  await page.goto(FIXTURE_BOOK_URL);
  await page.getByRole("button", { name: "Add Book" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Modal Club One").check();
  await dialog.getByLabel("Modal Club Two").check();
  await dialog.getByRole("button", { name: "Add to clubs" }).click();

  await expect(page.getByText("Book added to 2 clubs.")).toBeVisible();

  await page.getByRole("button", { name: "Add Book" }).click();
  await expect(
    dialog.getByText("This book is already active in every club you manage."),
  ).toBeVisible();
  await expect(dialog.getByLabel("Modal Club One")).toBeDisabled();
  await expect(dialog.getByLabel("Modal Club Two")).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Add to clubs" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Close add-book modal" }).click();

  await page.goto(firstClubUrl);
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();

  await page.goto(secondClubUrl);
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();
});

test("book detail can add a book to owned shelves from the Shelves tab", async ({
  page,
}) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.meShelvesNew);
  const firstShelfUrl = await createShelf(page, "Weekend Shelf");
  const secondShelfUrl = await createShelf(page, "Shared Shelf", "true");

  await page.goto(FIXTURE_BOOK_URL);
  await page.getByRole("button", { name: "Add Book" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: /^Shelves/ }).click();
  await dialog.getByLabel("Weekend Shelf").check();
  await dialog.getByLabel("Shared Shelf").check();
  await dialog.getByRole("button", { name: "Add to shelves" }).click();

  await expect(page.getByText("Book added to 2 shelves.")).toBeVisible();

  await page.getByRole("button", { name: "Add Book" }).click();
  await dialog.getByRole("tab", { name: /^Shelves/ }).click();
  await expect(
    dialog.getByText("This book is already on every shelf you own."),
  ).toBeVisible();
  await expect(dialog.getByLabel("Weekend Shelf")).toBeDisabled();
  await expect(dialog.getByLabel("Shared Shelf")).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Add to shelves" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Close add-book modal" }).click();

  await page.goto(firstShelfUrl);
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();

  await page.goto(secondShelfUrl);
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();
});

test("search results support the Clubs tab flow", async ({ page }) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.clubsNew);
  const clubUrl = await createClub(page, "Search Modal Club");

  await page.goto(SEARCH_RESULTS_URL);
  await expect(page.getByRole("button", { name: "Add Book" }).first()).toBeVisible();
  const firstResultTitle = (await page.locator("h2").first().textContent())?.trim();
  expect(firstResultTitle).toBeTruthy();

  await page.getByRole("button", { name: "Add Book" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(page.locator('body > [data-modal-root="book-add"]')).toBeVisible();
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Search Modal Club").check();
  await dialog.getByRole("button", { name: "Add to clubs" }).click();

  await expect(page.getByText("Book added to 1 club.")).toBeVisible();
  await expect(
    page.getByText("Already added to every club you manage."),
  ).toHaveCount(0);

  await page.goto(clubUrl);
  await expect(page.getByText(firstResultTitle!)).toBeVisible();
});

test("search results support the Shelves tab flow", async ({ page }) => {
  await signInAs(page, "owner", E2E_ROUTE_PATHS.meShelvesNew);
  const shelfUrl = await createShelf(page, "Search Shelf");

  await page.goto(SEARCH_RESULTS_URL);
  const firstResultTitle = (await page.locator("h2").first().textContent())?.trim();
  expect(firstResultTitle).toBeTruthy();

  await page.getByRole("button", { name: "Add Book" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: /^Shelves/ }).click();
  await dialog.getByLabel("Search Shelf").check();
  await dialog.getByRole("button", { name: "Add to shelves" }).click();

  await expect(page.getByText("Book added to 1 shelf.")).toBeVisible();

  await page.getByRole("button", { name: "Add Book" }).first().click();
  await dialog.getByRole("tab", { name: /^Shelves/ }).click();
  await expect(
    dialog.getByText("This book is already on every shelf you own."),
  ).toBeVisible();
  await expect(dialog.getByLabel("Search Shelf")).toBeDisabled();

  await page.goto(shelfUrl);
  await expect(page.getByText(firstResultTitle!)).toBeVisible();
});
