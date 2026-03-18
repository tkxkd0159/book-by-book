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

test("book detail shows an empty add-book modal when the user manages no clubs", async ({
  page,
}) => {
  await signInAs(page, "stranger", FIXTURE_BOOK_URL);

  await expect(page.getByRole("heading", { name: "Add to a club" })).toHaveCount(0);
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
  await expect(dialog.getByRole("button", { name: "Add Book" })).toBeDisabled();
});

test("book detail can add a book to multiple clubs and then shows them as already added", async ({
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
  await dialog.getByRole("button", { name: "Add Book" }).click();

  await expect(page.getByText("Book added to 2 clubs.")).toBeVisible();

  await page.getByRole("button", { name: "Add Book" }).click();
  await expect(
    dialog.getByText("This book is already active in every club you manage."),
  ).toBeVisible();
  await expect(dialog.getByLabel("Modal Club One")).toBeDisabled();
  await expect(dialog.getByLabel("Modal Club Two")).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Add Book" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Close add-book modal" }).click();

  await page.goto(firstClubUrl);
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();

  await page.goto(secondClubUrl);
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();
});

test("search results use the same add-book modal flow", async ({ page }) => {
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
  await dialog.getByRole("button", { name: "Add Book" }).click();

  await expect(page.getByText("Book added to 1 club.")).toBeVisible();
  await expect(
    page.getByText("Already added to every club you manage."),
  ).toHaveCount(0);

  await page.goto(clubUrl);
  await expect(page.getByText(firstResultTitle!)).toBeVisible();
});
