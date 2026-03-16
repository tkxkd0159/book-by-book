import { expect, test } from "@playwright/test";

import { resetApp, signInAs } from "./helpers/auth";

const CLUB_BOOK_URL = "/books/club-test-book";
const CLUB_DETAIL_URL_PATTERN = /\/clubs\/[0-9a-f-]+(?:\?|$)/i;

test.beforeEach(async ({ request }) => {
  await resetApp(request);
});

async function addFixtureBookToClub(page: import("@playwright/test").Page, clubName: string) {
  await page.goto(CLUB_BOOK_URL);
  await page.getByRole("button", { name: "Add Book" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(clubName).check();
  await dialog.getByRole("button", { name: "Add Book" }).click();
  await expect(page.getByText("Book added to 1 club.")).toBeVisible();
}

async function openFixtureBookCardDetails(page: import("@playwright/test").Page) {
  await page
    .getByLabel("Toggle details for The Test-Driven Book Club")
    .click();
}

test("user can create a public club and another user can join it", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Weekend Readers");
  await page.getByLabel("Description").fill("A public club for weekend reading.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByRole("heading", { name: "Weekend Readers" })).toBeVisible();

  await signInAs(page, "member", "/clubs");
  await expect(page.getByRole("heading", { name: "Discover Public Clubs" })).toBeVisible();
  await expect(page.getByText("Weekend Readers")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open club" })).toHaveCount(0);
  await page.getByRole("link", { name: "Open Weekend Readers" }).click();
  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);

  await page.goto("/clubs");
  await page.getByRole("button", { name: "Join club" }).click();

  await expect(page.getByText("You joined the club.")).toBeVisible();
  await expect(page.getByText("MEMBER", { exact: true })).toBeVisible();
});

test("private invite can be created and accepted by the matching user", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Private Circle");
  await page.getByLabel("Description").fill("Invitation only");
  await page.getByLabel("Visibility").selectOption("PRIVATE");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await page.getByRole("link", { name: "Manage invites" }).click();
  await page.getByLabel("Email").fill("member@book-by-book.test");
  await page.getByRole("button", { name: "Create invite" }).click();

  const inviteField = page.getByLabel("Most recent invite link");
  await expect(inviteField).toBeVisible();
  const inviteLink = await inviteField.inputValue();

  await signInAs(page, "member", "/clubs");
  await page.goto(inviteLink);

  await expect(page.getByRole("heading", { name: "Club invitation" })).toBeVisible();
  await page.getByRole("button", { name: "Accept invitation" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(page.getByText("Invitation accepted.")).toBeVisible();
  await expect(page.getByText("MEMBER", { exact: true })).toBeVisible();
});

test("member cannot access invite management for a club they joined", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Invite Guard Club");
  await page.getByLabel("Description").fill("Admin access should stay restricted.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(
    page.getByRole("heading", { name: "Invite Guard Club" }),
  ).toBeVisible();
  const clubPath = new URL(page.url()).pathname;
  const inviteUrl = `${clubPath}/invite`;

  await signInAs(page, "member", "/clubs");
  await page.goto(clubPath);

  await page.getByRole("button", { name: "Join club" }).click();
  await expect(page.getByText("You joined the club.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Manage invites" }),
  ).toHaveCount(0);

  const response = await page.goto(inviteUrl);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("404")).toBeVisible();
});

test("private clubs stay out of discovery for non-members", async ({ page }) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Stealth Readers");
  await page.getByLabel("Description").fill("This club should stay private.");
  await page.getByLabel("Visibility").selectOption("PRIVATE");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);

  await signInAs(page, "stranger", "/clubs");
  await expect(page.getByRole("heading", { name: "Discover Public Clubs" })).toBeVisible();
  await expect(page.getByText("Stealth Readers")).toHaveCount(0);
});

test("club admin can add, move, and remove a book in section management", async ({
  page,
}) => {
  await signInAs(page, "owner", "/clubs/new");

  await page.getByLabel("Name").fill("Section Operators");
  await page.getByLabel("Description").fill("Used for section transitions.");
  await page.getByLabel("Visibility").selectOption("PUBLIC");
  await page.getByRole("button", { name: "Create club" }).click();

  await expect(page).toHaveURL(CLUB_DETAIL_URL_PATTERN);
  await expect(
    page.getByRole("heading", { name: "Section Operators" }),
  ).toBeVisible();
  const clubUrl = page.url();

  await addFixtureBookToClub(page, "Section Operators");

  await page.goto(clubUrl);
  await expect(page.getByText("The Test-Driven Book Club")).toBeVisible();
  await expect(page.getByRole("link", { name: "Book details" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Want to Read" }),
  ).toBeVisible();

  await openFixtureBookCardDetails(page);
  await expect(page.getByRole("link", { name: "Book details" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Discussion" })).toBeVisible();
  await page.locator('select[name="status"]').first().selectOption("READING");
  await page.getByRole("button", { name: "Move" }).first().click();
  await expect(page.getByText("Book moved.")).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Reading", exact: true }),
  ).toBeVisible();
  await openFixtureBookCardDetails(page);
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Book removed.")).toBeVisible();
  await expect(page.getByText("No books in this section yet.")).toHaveCount(3);
});
